/** "agora", "há 12 s", "há 3 min", "há 2 h". */
export function tempoRelativo(ms: number | null | undefined, agora = Date.now()): string {
  if (ms == null) return '—';
  const s = Math.max(0, Math.round((agora - ms) / 1000));
  if (s < 2) return 'agora';
  if (s < 60) return `há ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h} h`;
}

export function tempoRelativoIso(iso: string | null | undefined, agora = Date.now()): string {
  return iso ? tempoRelativo(Date.parse(iso), agora) : '—';
}

export function hora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function numero(v: number, casas = 0): string {
  return v.toFixed(casas).replace('.', ',');
}

export function porcentagem(v: number): string {
  return `${Math.round(v * 100)}%`;
}
