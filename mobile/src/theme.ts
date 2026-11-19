import type { Nivel, Origem, RiscoArea, TipoRisco, TipoSensor } from './types';

export const cores = {
  fundo: '#F3F5F8',
  superficie: '#FFFFFF',
  texto: '#111827',
  textoSuave: '#5B6575',
  borda: '#E2E6EC',
  marca: '#0B3D5C',
  marcaClara: '#E6F0F6',
  ok: '#1E8E3E',
  okFundo: '#E7F5EC',
  offline: '#1F2937',
  aviso: '#F5B301',
};

export const corNivel: Record<RiscoArea, { fundo: string; texto: string; suave: string }> = {
  CRITICO: { fundo: '#B42318', texto: '#FFFFFF', suave: '#FDECEA' },
  ALTO: { fundo: '#E8590C', texto: '#FFFFFF', suave: '#FFF0E6' },
  MEDIO: { fundo: '#F5B301', texto: '#3B2A00', suave: '#FFF7DB' },
  BAIXO: { fundo: '#2F6FDE', texto: '#FFFFFF', suave: '#E9F0FD' },
  NORMAL: { fundo: '#1E8E3E', texto: '#FFFFFF', suave: '#E7F5EC' },
};

export const nomeNivel: Record<RiscoArea, string> = {
  CRITICO: 'Crítico',
  ALTO: 'Alto',
  MEDIO: 'Médio',
  BAIXO: 'Baixo',
  NORMAL: 'Normal',
};

export const ordemNivel: Record<Nivel, number> = { BAIXO: 0, MEDIO: 1, ALTO: 2, CRITICO: 3 };

export const iconeRisco: Record<TipoRisco, string> = {
  ALAGAMENTO: 'water',
  CALOR_EXTREMO: 'thermometer',
  FALTA_ENERGIA: 'flash-off',
};

export const iconeSensor: Record<TipoSensor, string> = {
  PLUVIOMETRO: 'rainy',
  NIVEL_CORREGO: 'water',
  TEMPERATURA: 'thermometer',
  ENERGIA: 'flash',
};

export const nomeOrigem: Record<Origem, string> = {
  SENSOR_OFICIAL: 'Sensor oficial',
  BASE_PUBLICA: 'Base pública',
  COMUNIDADE: 'Comunidade',
};

export const sombra = {
  shadowColor: '#0B1F33',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
