// Textos do feed: tempo desde a publicação e nome curto do destino.

/** "agora", "5 min", "2 h", "3 d", depois "12 set" (com ano se for de outro ano). */
export function timeAgo(iso?: string | null, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const min = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return d
    .toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      ...(d.getFullYear() === now.getFullYear() ? null : { year: 'numeric' }),
    })
    .replace('.', '');
}

/** "Praia do Sancho, Fernando de Noronha, Brasil" -> "Praia do Sancho, Fernando de Noronha" (máx. 28 caracteres). */
export function shortPlace(place?: string | null): string {
  if (!place) return '';
  const parts = place.split(',').map((p) => p.trim()).filter(Boolean);
  const kept = parts.filter((p) => !/brasil|brazil|estado|state|country|republic/i.test(p) || parts.length === 1);
  const result = (kept.length >= 2 ? `${kept[0]}, ${kept[1]}` : kept[0] ?? parts[0] ?? '');
  return result.length > 28 ? `${result.slice(0, 26)}…` : result;
}

/** Primeiro nome para exibir (o cadastro guarda o nome completo). */
export const displayName = (name?: string | null) => String(name ?? '').trim() || 'Viajante';
