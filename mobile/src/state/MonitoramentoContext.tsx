import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import { api, ErroApi } from '../api';
import { carregarUrlSalva, salvarUrl, urlAutomatica, urlWebSocket } from '../config';
import { ConexaoTempoReal, InfoConexao } from '../realtime/ConexaoTempoReal';
import type { Alerta, EventoAlerta, MensagemServidor, Painel, RelatoPendente, TipoRelato } from '../types';

const CHAVE_CACHE = 'risco-urbano:painel';
const CHAVE_PENDENTES = 'risco-urbano:relatos-pendentes';
const TAMANHO_HISTORICO = 40;

export interface ItemFeed {
  id: string;
  evento: EventoAlerta;
  alerta: Alerta;
  recebidoEm: number;
}

interface EstadoMonitoramento {
  urlApi: string;
  urlEhAutomatica: boolean;
  painel: Painel | null;
  historicos: Record<string, number[]>;
  conexao: InfoConexao;
  /** De onde vieram os dados que estão na tela. */
  origemDados: 'servidor' | 'cache' | null;
  /** Quando o app recebeu a última atualização (relógio do celular). */
  ultimaAtualizacao: number | null;
  intervaloMedioMs: number | null;
  notificacao: ItemFeed | null;
  feed: ItemFeed[];
  pendentes: RelatoPendente[];
  online: boolean;
  definirUrl: (url: string | null) => void;
  reconectarAgora: () => void;
  reconhecer: (id: string) => Promise<void>;
  enviarRelato: (dados: { areaId: string; tipo: TipoRelato; descricao: string }) => Promise<'enviado' | 'na-fila'>;
  fecharNotificacao: () => void;
}

const Contexto = createContext<EstadoMonitoramento | null>(null);

const conexaoInicial: InfoConexao = {
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

export function MonitoramentoProvider({ children }: { children: React.ReactNode }) {
  const [urlApi, setUrlApi] = useState(urlAutomatica());
  const [urlEhAutomatica, setUrlEhAutomatica] = useState(true);
  const [carregado, setCarregado] = useState(false);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [historicos, setHistoricos] = useState<Record<string, number[]>>({});
  const [conexao, setConexao] = useState<InfoConexao>(conexaoInicial);
  const [origemDados, setOrigemDados] = useState<'servidor' | 'cache' | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<number | null>(null);
  const [intervaloMedioMs, setIntervaloMedioMs] = useState<number | null>(null);
  const [notificacao, setNotificacao] = useState<ItemFeed | null>(null);
  const [feed, setFeed] = useState<ItemFeed[]>([]);
  const [pendentes, setPendentes] = useState<RelatoPendente[]>([]);

  const conexaoRef = useRef<ConexaoTempoReal | null>(null);
  const historicosRef = useRef(historicos);
  historicosRef.current = historicos;
  const ultimoTsSensor = useRef<Record<string, string>>({});
  const intervalos = useRef<number[]>([]);
  const ultimaChegada = useRef<number | null>(null);
  const ultimoSalvamento = useRef(0);
  const enviandoPendentes = useRef(false);
  const timerNotificacao = useRef<ReturnType<typeof setTimeout> | null>(null);

  const online = conexao.estado === 'online' && conexao.sincronizado;

  // 1) Carrega URL salva, último painel (cache) e relatos pendentes.
  useEffect(() => {
    (async () => {
      const salva = await carregarUrlSalva();
      if (salva) {
        setUrlApi(salva);
        setUrlEhAutomatica(false);
      }
      try {
        const cache = await AsyncStorage.getItem(CHAVE_CACHE);
        if (cache) {
          const p = JSON.parse(cache) as { painel: Painel; recebidoEm: number };
          setPainel((atual) => atual ?? p.painel);
          setUltimaAtualizacao((atual) => atual ?? p.recebidoEm);
          setOrigemDados((atual) => atual ?? 'cache');
          setHistoricos((atual) => (Object.keys(atual).length ? atual : historicosDoPainel(p.painel)));
        }
        const pend = await AsyncStorage.getItem(CHAVE_PENDENTES);
        if (pend) setPendentes(JSON.parse(pend));
      } catch {
        // cache corrompido ou indisponível: começa vazio
      }
      setCarregado(true);
    })();
  }, []);

  const mostrarNotificacao = useCallback((item: ItemFeed) => {
    setNotificacao(item);
    if (timerNotificacao.current) clearTimeout(timerNotificacao.current);
    timerNotificacao.current = setTimeout(() => setNotificacao(null), 6000);
    if (Platform.OS !== 'web') Vibration.vibrate(item.alerta.nivel === 'CRITICO' ? [0, 300, 150, 300] : 300);
  }, []);

  const aplicarPainel = useCallback((p: Painel, completo: boolean) => {
    const agora = Date.now();
    setPainel(p);
    setOrigemDados('servidor');
    setUltimaAtualizacao(agora);

    if (!completo && ultimaChegada.current != null) {
      intervalos.current = [...intervalos.current, agora - ultimaChegada.current].slice(-10);
      const media = intervalos.current.reduce((a, b) => a + b, 0) / intervalos.current.length;
      setIntervaloMedioMs(media);
    }
    ultimaChegada.current = agora;

    if (completo) {
      setHistoricos(historicosDoPainel(p));
      ultimoTsSensor.current = Object.fromEntries(p.sensores.map((s) => [s.id, s.atualizadoEm]));
    } else {
      setHistoricos((atual) => {
        const novo = { ...atual };
        for (const s of p.sensores) {
          if (ultimoTsSensor.current[s.id] === s.atualizadoEm) continue; // leitura repetida
          ultimoTsSensor.current[s.id] = s.atualizadoEm;
          novo[s.id] = [...(novo[s.id] ?? []), s.valor].slice(-TAMANHO_HISTORICO);
        }
        return novo;
      });
    }

    // guarda uma cópia para abrir o app sem conexão
    if (agora - ultimoSalvamento.current > 10000 || completo) {
      ultimoSalvamento.current = agora;
      const h = historicosRef.current;
      const comHistorico: Painel = { ...p, sensores: p.sensores.map((s) => ({ ...s, historico: h[s.id] ?? s.historico })) };
      AsyncStorage.setItem(CHAVE_CACHE, JSON.stringify({ painel: comHistorico, recebidoEm: agora })).catch(() => {});
    }
  }, []);

  const tratarMensagem = useCallback(
    (msg: MensagemServidor) => {
      switch (msg.tipo) {
        case 'snapshot':
          aplicarPainel(msg.dados, true);
          break;
        case 'tick':
          aplicarPainel(msg.dados, false);
          break;
        case 'alerta': {
          const item: ItemFeed = { id: `${msg.dados.id}-${msg.seq}`, evento: msg.evento, alerta: msg.dados, recebidoEm: Date.now() };
          if (msg.evento !== 'ATUALIZADO') setFeed((f) => [item, ...f].slice(0, 30));
          const grave = msg.dados.nivel === 'ALTO' || msg.dados.nivel === 'CRITICO';
          if ((msg.evento === 'NOVO' || msg.evento === 'ESCALONADO') && grave) mostrarNotificacao(item);
          break;
        }
        default:
          break;
      }
    },
    [aplicarPainel, mostrarNotificacao],
  );

  // 2) Abre a conexão em tempo real (depois de saber qual URL usar).
  useEffect(() => {
    if (!carregado) return;
    const conexao = new ConexaoTempoReal({
      url: urlWebSocket(urlApi),
      onMensagem: tratarMensagem,
      onEstado: setConexao,
    });
    conexaoRef.current = conexao;
    conexao.iniciar();
    return () => {
      conexao.parar();
      conexaoRef.current = null;
    };
    // a URL é trocada com trocarUrl, sem recriar a conexão
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado]);

  useEffect(() => {
    conexaoRef.current?.trocarUrl(urlWebSocket(urlApi));
  }, [urlApi]);

  // 3) Voltou para o app: tenta reconectar na hora em vez de esperar.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') conexaoRef.current?.reconectarAgora();
    });
    return () => sub.remove();
  }, []);

  const salvarPendentes = useCallback((lista: RelatoPendente[]) => {
    setPendentes(lista);
    AsyncStorage.setItem(CHAVE_PENDENTES, JSON.stringify(lista)).catch(() => {});
  }, []);

  // 4) Conexão voltou: envia os relatos que ficaram na fila.
  useEffect(() => {
    if (!online || pendentes.length === 0 || enviandoPendentes.current) return;
    enviandoPendentes.current = true;
    (async () => {
      let restantes = [...pendentes];
      for (const p of pendentes) {
        try {
          await api.enviarRelato(urlApi, { areaId: p.areaId, tipo: p.tipo, descricao: p.descricao });
          restantes = restantes.filter((r) => r.idLocal !== p.idLocal);
        } catch (e) {
          if (e instanceof ErroApi && e.semConexao) break; // caiu de novo: tenta depois
          restantes = restantes.filter((r) => r.idLocal !== p.idLocal); // rejeitado pelo servidor: descarta
        }
      }
      salvarPendentes(restantes);
      enviandoPendentes.current = false;
    })();
  }, [online, pendentes, urlApi, salvarPendentes]);

  const definirUrl = useCallback((url: string | null) => {
    salvarUrl(url);
    setUrlEhAutomatica(url == null);
    setUrlApi(url ?? urlAutomatica());
  }, []);

  const reconectarAgora = useCallback(() => conexaoRef.current?.reconectarAgora(), []);

  const reconhecer = useCallback(
    async (id: string) => {
      const atualizado = await api.reconhecer(urlApi, id);
      // atualiza na hora; o próximo tick confirma
      setPainel((p) => (p ? { ...p, alertas: p.alertas.map((a) => (a.id === id ? atualizado : a)) } : p));
    },
    [urlApi],
  );

  const enviarRelato = useCallback(
    async (dados: { areaId: string; tipo: TipoRelato; descricao: string }): Promise<'enviado' | 'na-fila'> => {
      const naFila = () => {
        const item: RelatoPendente = {
          idLocal: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...dados,
          criadoEm: Date.now(),
          tentativas: 0,
        };
        salvarPendentes([...pendentes, item]);
        return 'na-fila' as const;
      };
      if (!online) return naFila();
      try {
        await api.enviarRelato(urlApi, dados);
        return 'enviado';
      } catch (e) {
        if (e instanceof ErroApi && e.semConexao) return naFila();
        throw e;
      }
    },
    [online, pendentes, urlApi, salvarPendentes],
  );

  const fecharNotificacao = useCallback(() => setNotificacao(null), []);

  const valor = useMemo<EstadoMonitoramento>(
    () => ({
      urlApi,
      urlEhAutomatica,
      painel,
      historicos,
      conexao,
      origemDados,
      ultimaAtualizacao,
      intervaloMedioMs,
      notificacao,
      feed,
      pendentes,
      online,
      definirUrl,
      reconectarAgora,
      reconhecer,
      enviarRelato,
      fecharNotificacao,
    }),
    [urlApi, urlEhAutomatica, painel, historicos, conexao, origemDados, ultimaAtualizacao, intervaloMedioMs, notificacao, feed,
      pendentes, online, definirUrl, reconectarAgora, reconhecer, enviarRelato, fecharNotificacao],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useMonitoramento(): EstadoMonitoramento {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useMonitoramento precisa estar dentro de MonitoramentoProvider');
  return ctx;
}

/** Re-renderiza a cada intervalo (para textos como "há 12 s" e contagens regressivas). */
export function useAgora(intervaloMs = 1000): number {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}

function historicosDoPainel(p: Painel): Record<string, number[]> {
  return Object.fromEntries(p.sensores.map((s) => [s.id, (s.historico ?? [s.valor]).slice(-TAMANHO_HISTORICO)]));
}
