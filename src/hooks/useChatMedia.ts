import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Mídia do chat fica em buckets privados. A mensagem guarda só a referência
// (`bucket/caminho`); o link assinado é gerado na hora de exibir, então nunca expira
// para quem está na conversa. Links assinados antigos salvos no banco também são aceitos.
const PATH_REF = /^(chat_audio|chat_images|chat_videos)\/(.+)$/;
const STORAGE_URL = /\/storage\/v1\/object\/(?:sign|public|authenticated)\/(chat_audio|chat_images|chat_videos)\/([^?]+)/;

const SIGNED_URL_TTL = 60 * 60; // 1 hora

export async function resolveChatMediaUrl(ref: string): Promise<string> {
  const match = ref.match(PATH_REF) ?? ref.match(STORAGE_URL);
  if (!match) return ref; // não é mídia do chat (ex.: URI local)

  const [, bucket, path] = match;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(decodeURIComponent(path), SIGNED_URL_TTL);
  if (error || !data) throw error ?? new Error('Mídia indisponível.');
  return data.signedUrl;
}

export function useChatMediaUrl(ref?: string | null) {
  return useQuery({
    queryKey: ['chatMedia', ref],
    queryFn: () => resolveChatMediaUrl(ref as string),
    enabled: !!ref,
    staleTime: (SIGNED_URL_TTL - 10 * 60) * 1000, // renova antes de expirar
    gcTime: SIGNED_URL_TTL * 1000,
  });
}
