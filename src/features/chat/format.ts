// Textos da lista de conversas: hora curta e prévia da última mensagem.

export type PreviewIcon = 'photo' | 'voice' | 'video' | 'call';

export interface PreviewMessage {
  text?: string | null;
  sender_id?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  sender?: { name?: string | null } | null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Hoje: "14:32". Ontem: "Ontem". Esta semana: "Seg". Antes disso: "12/09" (com ano se for de outro ano). */
export function shortWhen(iso?: string | null, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Ontem';
  if (days < 7) return capitalize(d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    ...(d.getFullYear() === now.getFullYear() ? null : { year: '2-digit' }),
  });
}

// Texto que o app grava sozinho quando a pessoa manda mídia sem legenda
const MEDIA_PLACEHOLDERS = new Set(['[Foto]', '[Vídeo]', '[Mensagem de Voz]']);

/** Prévia pronta para a lista: ícone opcional + texto. `isGroup` põe o nome de quem falou. */
export function messagePreview(
  msg: PreviewMessage | null | undefined,
  myId: string | null,
  isGroup: boolean,
): { icon: PreviewIcon | null; text: string } {
  if (!msg) return { icon: null, text: 'Diga oi para começar' };

  const text = (msg.text ?? '').trim();

  // Mensagens de sistema das chamadas ([SYS:CALL_*] + JSON) nunca aparecem cruas
  if (text.startsWith('[SYS:')) {
    const mine = msg.sender_id === myId;
    if (text.startsWith('[SYS:CALL_ENDED]')) return { icon: 'call', text: 'Chamada encerrada' };
    if (text.startsWith('[SYS:CALL_REJECTED]')) return { icon: 'call', text: 'Chamada recusada' };
    if (text.startsWith('[SYS:CALL_OFFER]')) return { icon: 'call', text: mine ? 'Você ligou' : 'Chamada perdida' };
    return { icon: 'call', text: 'Chamada' };
  }

  const caption = MEDIA_PLACEHOLDERS.has(text) ? '' : text;
  let icon: PreviewIcon | null = null;
  let body = caption;
  if (msg.audio_url) { icon = 'voice'; body = caption || 'Mensagem de voz'; }
  else if (msg.image_url) { icon = 'photo'; body = caption || 'Foto'; }
  else if (msg.video_url) { icon = 'video'; body = caption || 'Vídeo'; }

  let prefix = '';
  if (msg.sender_id === myId) prefix = 'Você: ';
  else if (isGroup) {
    const first = String(msg.sender?.name ?? '').trim().split(/\s+/)[0];
    if (first) prefix = `${first}: `;
  }
  return { icon, text: `${prefix}${body}` };
}

// A exclusão de conta mantém a linha do usuário, renomeada (ver settings.tsx)
export const isDeletedName = (name?: string | null) => name === 'Conta Excluída' || name === 'Usuário Romy';

/** "14:32" */
export const clockTime = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
};

/** Separador de dia dentro da conversa: "Hoje", "Ontem", "12 de set." (com ano se for de outro ano). */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? null : { year: 'numeric' }),
  });
}
