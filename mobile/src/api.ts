import type { Alerta, Cenario, CenarioAtivo, Relato, TipoRelato } from './types';

/** Erro de rede/servidor com mensagem pronta para mostrar ao usuário. */
export class ErroApi extends Error {
  constructor(mensagem: string, public readonly status?: number, public readonly semConexao = false) {
    super(mensagem);
  }
}

/**
 * fetch com tempo limite: se o servidor não responder, a promessa falha em
 * poucos segundos em vez de deixar a tela "presa" esperando.
 */
async function requisitar<T>(base: string, caminho: string, init: RequestInit = {}, timeoutMs = 5000): Promise<T> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);
  let resp: Response;
  try {
    resp = await fetch(`${base}${caminho}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: controle.signal,
    });
  } catch {
    throw new ErroApi('Sem conexão com o servidor.', undefined, true);
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    let mensagem = `Erro ${resp.status}`;
    try {
      const corpo = await resp.json();
      if (corpo?.campos) mensagem = Object.values(corpo.campos).join('\n');
      else if (corpo?.mensagem) mensagem = corpo.mensagem;
    } catch {
      // corpo sem JSON
    }
    throw new ErroApi(mensagem, resp.status);
  }
  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

export const api = {
  status: (base: string) => requisitar<{ status: string; versao: string; clientesConectados: number }>(base, '/api/status', {}, 3000),
  alertasResolvidos: (base: string) => requisitar<Alerta[]>(base, '/api/alertas?status=resolvidos'),
  reconhecer: (base: string, id: string) => requisitar<Alerta>(base, `/api/alertas/${encodeURIComponent(id)}/reconhecer`, { method: 'POST' }),
  enviarRelato: (base: string, corpo: { areaId: string; tipo: TipoRelato; descricao: string }) =>
    requisitar<Relato>(base, '/api/relatos', { method: 'POST', body: JSON.stringify(corpo) }),
  ativarCenario: (base: string, areaId: string, cenario: Cenario, duracaoSegundos = 90) =>
    requisitar<CenarioAtivo>(base, '/api/simulador/cenarios', { method: 'POST', body: JSON.stringify({ areaId, cenario, duracaoSegundos }) }),
  normalizar: (base: string) => requisitar<void>(base, '/api/simulador/cenarios', { method: 'DELETE' }),
};
