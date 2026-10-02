import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// O plano grátis do Supabase tem 5 GB por mês de tráfego de arquivos (fotos, vídeos, áudios).
// Tudo que sai do Storage conta, então: arquivos menores e guardados no aparelho por mais tempo.

/** Os nomes dos arquivos levam data e hora e nunca são reescritos: o navegador e o app podem guardar por 1 ano. */
export const CACHE_FOREVER = '31536000';

/** Lado maior das fotos enviadas: nítido na tela cheia de um celular, uma fração do tamanho da câmera. */
export const PHOTO_MAX_SIDE = 1440;
/** Fotos de perfil e de comunidade aparecem menores. */
export const AVATAR_MAX_SIDE = 1080;

/**
 * Reduz a foto antes do envio (lado maior até `maxSide`, JPEG com qualidade 0,75).
 * Uma foto de câmera de 3–5 MB costuma ficar com 200–400 KB. Se algo falhar, devolve a original.
 */
export async function shrinkImage(uri: string, maxSide = PHOTO_MAX_SIDE): Promise<{ uri: string; changed: boolean }> {
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const longest = Math.max(original.width, original.height);
    const image = longest > maxSide
      ? await ImageManipulator.manipulate(original)
          .resize(original.width >= original.height ? { width: maxSide } : { height: maxSide })
          .renderAsync()
      : original;
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 });
    return { uri: saved.uri, changed: true };
  } catch (err) {
    console.warn('Não foi possível reduzir a foto; enviando a original:', err);
    return { uri, changed: false };
  }
}
