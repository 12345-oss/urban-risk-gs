/**
 * Conexão em tempo real com a API (WebSocket) que nunca trava o app.
 *
 * - Detecta queda de duas formas: o socket fecha (servidor parou) ou o
 *   servidor fica em silêncio por mais que `silencioMaxMs` (rede caiu sem
 *   avisar). O servidor manda algo a cada 2 s, então silêncio = problema.
 * - Reconecta sozinha com espera crescente (1 s, 2 s, 4 s... até 10 s).
 * - Ao reconectar, o servidor manda um snapshot completo: o app se
 *   ressincroniza sem precisar recarregar a tela.
 * - Mede a latência com ping/pong e confere a sequência das mensagens
 *   (se faltar alguma, pede um "sync").
 *
 * Não depende de React: é uma classe simples, fácil de testar.
 */

export type EstadoConexao = 'conectando' | 'online' | 'reconectando';

export interface InfoConexao {
  estado: EstadoConexao;
  /** Já recebeu dados nesta conexão (snapshot). */
  sincronizado: boolean;
  tentativa: number;
  /** Quando será a próxima tentativa (epoch ms), se estiver esperando. */
  proximaTentativaEm: number | null;
  /** Quando a conexão caiu (epoch ms). null se nunca caiu ou está online. */
  desconectadoDesde: number | null;
  ultimaMensagemEm: number | null;
  latenciaMs: number | null;
  ultimoErro: string | null;
  quedas: number;
}

export interface OpcoesConexao {
  url: string;
  onMensagem: (mensagem: any) => void;
  onEstado: (info: InfoConexao) => void;
  silencioMaxMs?: number;
  pingIntervaloMs?: number;
  timeoutConexaoMs?: number;
  esperas?: number[];
  /** Permite injetar outra implementação (testes). */
  criarSocket?: (url: string) => WebSocket;
}

const ESPERAS_PADRAO = [1000, 2000, 4000, 8000, 10000];

export class ConexaoTempoReal {
  private socket: WebSocket | null = null;
  private geracao = 0;
  private ativo = false;
  private ultimoSeq: number | null = null;
  private pingsPendentes = new Map<string, number>();
  private timerReconexao: ReturnType<typeof setTimeout> | null = null;
  private timerVigia: ReturnType<typeof setInterval> | null = null;
  private timerPing: ReturnType<typeof setInterval> | null = null;
  private timerAbertura: ReturnType<typeof setTimeout> | null = null;
  private info: InfoConexao = {
    estado: 'conectando',
    sincronizado: false,
    tentativa: 0,
    proximaTentativaEm: null,
    desconectadoDesde: null,
    ultimaMensagemEm: null,
    latenciaMs: null,
    ultimoErro: null,
    quedas: 0,
  };

  private readonly silencioMaxMs: number;
  private readonly pingIntervaloMs: number;
  private readonly timeoutConexaoMs: number;
  private readonly esperas: number[];

  constructor(private opcoes: OpcoesConexao) {
    this.silencioMaxMs = opcoes.silencioMaxMs ?? 6000;
    this.pingIntervaloMs = opcoes.pingIntervaloMs ?? 5000;
    this.timeoutConexaoMs = opcoes.timeoutConexaoMs ?? 5000;
    this.esperas = opcoes.esperas ?? ESPERAS_PADRAO;
  }

  get estadoAtual(): InfoConexao {
    return this.info;
  }

  iniciar(): void {
    if (this.ativo) return;
    this.ativo = true;
    this.abrir();
    this.timerVigia = setInterval(() => this.vigiar(), 1000);
  }

  parar(): void {
    this.ativo = false;
    this.limparTimersDeConexao();
    if (this.timerReconexao) clearTimeout(this.timerReconexao);
    if (this.timerVigia) clearInterval(this.timerVigia);
    this.timerReconexao = null;
    this.timerVigia = null;
    this.fecharSocket();
  }

  /** Botão "Tentar agora" ou app voltando ao primeiro plano. */
  reconectarAgora(): void {
    if (!this.ativo) return;
    if (this.info.estado === 'online') return;
    if (this.timerReconexao) clearTimeout(this.timerReconexao);
    this.timerReconexao = null;
    this.abrir();
  }

  trocarUrl(url: string): void {
    this.opcoes = { ...this.opcoes, url };
    this.ultimoSeq = null;
    if (!this.ativo) return;
    if (this.timerReconexao) clearTimeout(this.timerReconexao);
    this.timerReconexao = null;
    this.atualizar({ tentativa: 0 });
    this.abrir();
  }

  enviar(dados: object): boolean {
    const s = this.socket;
    if (!s || s.readyState !== 1 /* OPEN */) return false;
    try {
      s.send(JSON.stringify(dados));
      return true;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------ interno

  private abrir(): void {
    this.fecharSocket();
    this.limparTimersDeConexao();
    const geracao = ++this.geracao;
    const jaCaiu = this.info.desconectadoDesde != null;
    this.atualizar({
      estado: jaCaiu ? 'reconectando' : 'conectando',
      proximaTentativaEm: null,
      sincronizado: false,
    });

    let socket: WebSocket;
    try {
      socket = this.opcoes.criarSocket ? this.opcoes.criarSocket(this.opcoes.url) : new WebSocket(this.opcoes.url);
    } catch (e) {
      this.aoCair(geracao, `URL inválida: ${this.opcoes.url}`);
      return;
    }
    this.socket = socket;

    // Se o handshake não terminar logo, desiste e tenta de novo.
    this.timerAbertura = setTimeout(() => {
      if (geracao === this.geracao && this.info.estado !== 'online') {
        this.aoCair(geracao, 'Tempo esgotado ao conectar');
      }
    }, this.timeoutConexaoMs);

    socket.onopen = () => {
      if (geracao !== this.geracao) return;
      if (this.timerAbertura) clearTimeout(this.timerAbertura);
      this.timerAbertura = null;
      const agora = Date.now();
      this.ultimoSeq = null;
      this.atualizar({
        estado: 'online',
        tentativa: 0,
        desconectadoDesde: null,
        ultimaMensagemEm: agora,
        ultimoErro: null,
      });
      this.timerPing = setInterval(() => this.ping(), this.pingIntervaloMs);
      this.ping();
    };

    socket.onmessage = (evento: MessageEvent) => {
      if (geracao !== this.geracao) return;
      const agora = Date.now();
      let msg: any;
      try {
        msg = JSON.parse(String(evento.data));
      } catch {
        return;
      }
      const mudancas: Partial<InfoConexao> = { ultimaMensagemEm: agora };

      if (msg.tipo === 'pong') {
        const enviadoEm = this.pingsPendentes.get(msg.id);
        if (enviadoEm != null) {
          this.pingsPendentes.delete(msg.id);
          mudancas.latenciaMs = agora - enviadoEm;
        }
        this.atualizar(mudancas);
        return;
      }

      if (typeof msg.seq === 'number') {
        if (msg.tipo === 'snapshot') {
          this.ultimoSeq = msg.seq;
          mudancas.sincronizado = true;
        } else if (this.ultimoSeq != null && msg.seq > this.ultimoSeq + 1) {
          // perdemos mensagens no caminho: pede o estado completo de novo
          this.enviar({ tipo: 'sync' });
          this.ultimoSeq = msg.seq;
        } else if (this.ultimoSeq == null || msg.seq > this.ultimoSeq) {
          this.ultimoSeq = msg.seq;
        }
      }
      this.atualizar(mudancas);
      try {
        this.opcoes.onMensagem(msg);
      } catch (e) {
        // erro no tratamento de uma mensagem não pode derrubar a conexão
        console.warn('Erro ao tratar mensagem', e);
      }
    };

    socket.onerror = () => {
      if (geracao !== this.geracao) return;
      this.aoCair(geracao, 'Erro de conexão');
    };

    socket.onclose = () => {
      if (geracao !== this.geracao) return;
      this.aoCair(geracao, 'Conexão encerrada pelo servidor');
    };
  }

  private aoCair(geracao: number, motivo: string): void {
    if (geracao !== this.geracao || !this.ativo) return;
    this.geracao++; // invalida callbacks atrasados do socket antigo
    const estavaOnline = this.info.estado === 'online';
    this.fecharSocket();
    this.limparTimersDeConexao();
    this.pingsPendentes.clear();

    const tentativa = this.info.tentativa + 1;
    const base = this.esperas[Math.min(tentativa - 1, this.esperas.length - 1)];
    const espera = Math.round(base * (0.85 + Math.random() * 0.3)); // jitter p/ não sincronizar clientes
    const agora = Date.now();

    this.atualizar({
      estado: 'reconectando',
      sincronizado: false,
      tentativa,
      proximaTentativaEm: agora + espera,
      desconectadoDesde: this.info.desconectadoDesde ?? agora,
      latenciaMs: null,
      ultimoErro: motivo,
      quedas: estavaOnline ? this.info.quedas + 1 : this.info.quedas,
    });

    if (this.timerReconexao) clearTimeout(this.timerReconexao);
    this.timerReconexao = setTimeout(() => {
      this.timerReconexao = null;
      if (this.ativo) this.abrir();
    }, espera);
  }

  /** Roda a cada segundo: detecta servidor mudo. */
  private vigiar(): void {
    if (this.info.estado !== 'online' || this.info.ultimaMensagemEm == null) return;
    if (Date.now() - this.info.ultimaMensagemEm > this.silencioMaxMs) {
      this.aoCair(this.geracao, 'Servidor sem responder');
    }
  }

  private ping(): void {
    const id = Math.random().toString(36).slice(2, 10);
    if (this.enviar({ tipo: 'ping', id })) {
      this.pingsPendentes.set(id, Date.now());
      // não deixa o mapa crescer se pongs se perderem
      if (this.pingsPendentes.size > 20) {
        const primeiro = this.pingsPendentes.keys().next().value;
        if (primeiro !== undefined) this.pingsPendentes.delete(primeiro);
      }
    }
  }

  private fecharSocket(): void {
    const s = this.socket;
    this.socket = null;
    if (!s) return;
    s.onopen = null;
    s.onmessage = null;
    s.onerror = null;
    s.onclose = null;
    try {
      s.close();
    } catch {
      // ignora
    }
  }

  private limparTimersDeConexao(): void {
    if (this.timerPing) clearInterval(this.timerPing);
    if (this.timerAbertura) clearTimeout(this.timerAbertura);
    this.timerPing = null;
    this.timerAbertura = null;
  }

  private atualizar(mudancas: Partial<InfoConexao>): void {
    this.info = { ...this.info, ...mudancas };
    try {
      this.opcoes.onEstado(this.info);
    } catch {
      // ignora erros do listener
    }
  }
}
