// Tipos espelhando os DTOs da API Spring Boot.

export type Nivel = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
export type RiscoArea = Nivel | 'NORMAL';
export type TipoRisco = 'ALAGAMENTO' | 'CALOR_EXTREMO' | 'FALTA_ENERGIA';
export type TipoRelato = 'ALAGAMENTO' | 'CALOR_EXTREMO' | 'SEM_ENERGIA';
export type Origem = 'SENSOR_OFICIAL' | 'BASE_PUBLICA' | 'COMUNIDADE';
export type TipoSensor = 'PLUVIOMETRO' | 'NIVEL_CORREGO' | 'TEMPERATURA' | 'ENERGIA';
export type Cenario = 'NORMAL' | 'TEMPESTADE' | 'ONDA_DE_CALOR' | 'APAGAO' | 'FALHA_SENSOR';

export interface Sensor {
  id: string;
  areaId: string;
  tipo: TipoSensor;
  tipoDescricao: string;
  nome: string;
  origem: Origem;
  origemDescricao: string;
  valor: number;
  unidade: string;
  atualizadoEm: string;
  desatualizado: boolean;
  confianca: number;
  historico?: number[];
}

export interface Alerta {
  id: string;
  areaId: string;
  areaNome: string;
  tipo: TipoRisco;
  tipoDescricao: string;
  nivel: Nivel;
  status: 'ATIVO' | 'RECONHECIDO' | 'RESOLVIDO';
  confianca: number;
  confirmado: boolean;
  prioridade: number;
  origens: Origem[];
  fontes: string[];
  mensagem: string;
  recomendacao: string;
  valorReferencia: string;
  criadoEm: string;
  atualizadoEm: string;
  reconhecidoEm: string | null;
  resolvidoEm: string | null;
  escalonamentos: number;
}

export interface Area {
  id: string;
  nome: string;
  referencia: string;
  latitude: number;
  longitude: number;
  risco: RiscoArea;
  alertasAbertos: number;
  cenario: Cenario;
}

export interface Relato {
  id: string;
  areaId: string;
  areaNome: string;
  tipo: TipoRelato;
  descricao: string;
  origem: Origem;
  criadoEm: string;
}

export interface Resumo {
  alertasAbertos: number;
  criticos: number;
  altos: number;
  naoReconhecidos: number;
  sensoresOnline: number;
  sensoresTotal: number;
  relatosUltimaHora: number;
}

export interface CenarioAtivo {
  areaId: string;
  cenario: Cenario;
  descricao: string;
  inicio: string;
  fim: string;
}

export interface Painel {
  ts: string;
  servidorIniciadoEm: string;
  intervaloAtualizacaoMs: number;
  resumo: Resumo;
  areas: Area[];
  alertas: Alerta[];
  sensores: Sensor[];
  relatos: Relato[];
  cenarios: CenarioAtivo[];
}

export type EventoAlerta = 'NOVO' | 'ESCALONADO' | 'ATUALIZADO' | 'RECONHECIDO' | 'RESOLVIDO';

/** Mensagens recebidas pelo WebSocket. */
export type MensagemServidor =
  | { tipo: 'snapshot'; seq: number; ts: string; dados: Painel }
  | { tipo: 'tick'; seq: number; ts: string; dados: Painel }
  | { tipo: 'alerta'; seq: number; ts: string; evento: EventoAlerta; dados: Alerta }
  | { tipo: 'relato'; seq: number; ts: string; dados: Relato }
  | { tipo: 'heartbeat'; seq: number; ts: string }
  | { tipo: 'pong'; id: string; ts: string };

export interface RelatoPendente {
  idLocal: string;
  areaId: string;
  tipo: TipoRelato;
  descricao: string;
  criadoEm: number;
  tentativas: number;
}
