import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Session, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * true = perfil completo, false = falta terminar o cadastro,
 * null = não deu para verificar (rede ou servidor) — nunca tratar como "incompleto".
 */
export async function checkProfileComplete(userId: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('city, dob')
      .eq('id', userId)
      .maybeSingle();

    if (error) return null;
    // Um perfil completo tem pelo menos a cidade e a data de nascimento preenchidas
    return Boolean(data?.city && data?.dob);
  } catch (e) {
    console.warn('Erro ao verificar status do perfil:', e);
    return null;
  }
}

const PROFILE_ATTEMPTS = 3;
const PROFILE_ATTEMPT_TIMEOUT_MS = 5000;
const SLOW_BOOT_MS = 10000;

// Conexão ruim é comum no celular: tenta algumas vezes antes de desistir.
async function verifyProfile(userId: string): Promise<boolean | null> {
  for (let attempt = 1; attempt <= PROFILE_ATTEMPTS; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), PROFILE_ATTEMPT_TIMEOUT_MS);
    });
    const result = await Promise.race([checkProfileComplete(userId), timeout]);
    clearTimeout(timer);
    if (result !== null) return result;
    if (attempt < PROFILE_ATTEMPTS) await new Promise((r) => setTimeout(r, 600 * attempt));
  }
  return null;
}

interface AuthContextType {
  session: Session | null;
  /** Só na abertura do app: sessão (e perfil, se houver sessão) ainda sendo conferidos. */
  isLoading: boolean;
  /** null enquanto não se sabe (carregando ou sem conexão — veja `loadError`). */
  isProfileComplete: boolean | null;
  /** Não deu para confirmar a conta por falta de conexão; não significa deslogado. */
  loadError: boolean;
  retry: () => Promise<void>;
  refreshProfile: () => Promise<boolean | null>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: false,
  isProfileComplete: null,
  loadError: false,
  retry: async () => {},
  refreshProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  // Só a avaliação mais recente vale (login → logout → login rápido não mistura contas).
  const evaluationRef = useRef(0);
  const mountedRef = useRef(true);

  // A abertura e o evento de login chegam quase juntos: quem pede o mesmo usuário reaproveita a consulta em andamento.
  const inflightRef = useRef<{ userId: string; promise: Promise<boolean | null> } | null>(null);

  const evaluateProfile = useCallback((userId: string | undefined): Promise<boolean | null> => {
    const run = ++evaluationRef.current;
    if (!userId) {
      setIsProfileComplete(null);
      setLoadError(false);
      return Promise.resolve(null);
    }
    if (inflightRef.current?.userId === userId) return inflightRef.current.promise;

    const promise: Promise<boolean | null> = verifyProfile(userId)
      .then((complete) => {
        if (!mountedRef.current || run !== evaluationRef.current) return complete;
        if (complete === null) {
          setLoadError(true);
        } else {
          setLoadError(false);
          setIsProfileComplete(complete);
        }
        return complete;
      })
      .finally(() => {
        if (inflightRef.current?.promise === promise) inflightRef.current = null;
      });
    inflightRef.current = { userId, promise };
    return promise;
  }, []);

  const refreshProfile = useCallback(
    () => evaluateProfile(sessionRef.current?.user?.id),
    [evaluateProfile],
  );

  // Lê a sessão salva e, se houver, confere o perfil. Só então o app decide para onde ir.
  const bootstrap = useCallback(async () => {
    // Rede muito lenta: avisa em vez de deixar o carregamento eterno (a tentativa continua).
    const slowTimer = setTimeout(() => {
      if (mountedRef.current) setLoadError(true);
    }, SLOW_BOOT_MS);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      // Renovar o token sem internet falha, mas a sessão continua salva: não é "deslogado".
      if (error && isAuthRetryableFetchError(error)) {
        setLoadError(true);
        return;
      }
      sessionRef.current = data.session;
      setSession(data.session);
      await evaluateProfile(data.session?.user?.id);
    } finally {
      clearTimeout(slowTimer);
      if (mountedRef.current) setIsLoading(false);
    }
  }, [evaluateProfile]);

  const retry = useCallback(async () => {
    setIsLoading(true);
    await bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    mountedRef.current = true;

    // Retorno do OAuth (PKCE do Google) no web: a sessão chega pelo onAuthStateChange.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code)
            .then(({ error }) => {
              if (error) console.warn('Erro ao trocar code no Web:', error);
              else window.history.replaceState({}, document.title, window.location.pathname);
            })
            .catch((e) => console.warn('Falha no exchangeCodeForSession Web:', e));
        }
      } catch (e) {
        console.warn('Erro ao ler URL de autenticação:', e);
      }
    }

    // Callback síncrono de propósito: chamar o Supabase dentro dele (await) trava o cliente.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION') return; // o bootstrap já cuida da abertura
      const previousId = sessionRef.current?.user?.id;
      const nextId = next?.user?.id;
      sessionRef.current = next;
      setSession(next);
      // Renovação de token ou volta à aba: mesmo usuário, o perfil continua valendo.
      if (nextId === previousId) return;
      setIsProfileComplete(null);
      setLoadError(false);
      setTimeout(() => evaluateProfile(nextId), 0);
    });

    bootstrap();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [bootstrap, evaluateProfile]);

  return (
    <AuthContext.Provider value={{ session, isLoading, isProfileComplete, loadError, retry, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
