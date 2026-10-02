import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, AudioModule } from 'expo-audio';

export interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl60: string;
}

/** Busca no iTunes com espera entre as digitações e prévia de 30 s de uma música por vez. */
export function useMusicSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef('');
  const player = useRef<any>(null);

  const stop = useCallback(() => {
    try { player.current?.pause(); player.current?.release(); } catch { /* já liberado */ }
    player.current = null;
    setPlayingId(null);
  }, []);

  const search = useCallback((text: string) => {
    setQuery(text);
    latest.current = text;
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setFailed(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(text)}&entity=song&limit=20`);
        const data = await res.json();
        // Resposta de uma busca antiga não sobrescreve a mais recente
        if (latest.current === text) { setResults(data.results ?? []); setFailed(false); }
      } catch {
        if (latest.current === text) setFailed(true);
      } finally {
        if (latest.current === text) setSearching(false);
      }
    }, 450);
  }, []);

  const preview = useCallback(async (song: Song) => {
    const same = playingId === song.trackId;
    stop();
    if (same) return;
    try {
      await AudioModule.setAudioModeAsync({ playsInSilentMode: true });
      const p = createAudioPlayer({ uri: song.previewUrl });
      p.play();
      player.current = p;
      setPlayingId(song.trackId);
    } catch (err) {
      console.warn('Erro ao tocar a prévia:', err);
    }
  }, [playingId, stop]);

  const reset = useCallback(() => {
    stop();
    setQuery('');
    setResults([]);
    setFailed(false);
  }, [stop]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    try { player.current?.pause(); player.current?.release(); } catch { /* já liberado */ }
  }, []);

  return { query, results, searching, failed, playingId, search, preview, stop, reset };
}
