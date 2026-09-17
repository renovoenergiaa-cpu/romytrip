import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export async function checkProfileComplete(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('city, dob')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return false;
    // Um perfil completo tem pelo menos a cidade e a data de nascimento preenchidas
    return Boolean(data.city && data.dob);
  } catch (e) {
    console.warn('Erro ao verificar status do perfil:', e);
    return false;
  }
}

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  isProfileComplete: boolean | null;
  refreshProfile: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: false,
  isProfileComplete: null,
  refreshProfile: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);

  const evaluateProfile = useCallback(async (currentSession: Session | null): Promise<boolean> => {
    if (!currentSession?.user?.id) {
      setIsProfileComplete(null);
      return false;
    }
    try {
      const checkPromise = checkProfileComplete(currentSession.user.id);
      const timeoutPromise = new Promise<boolean>((res) => setTimeout(() => res(false), 2000));
      const complete = await Promise.race([checkPromise, timeoutPromise]);
      setIsProfileComplete(complete);
      return complete;
    } catch {
      setIsProfileComplete(false);
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<boolean> => {
    return evaluateProfile(session);
  }, [evaluateProfile, session]);

  useEffect(() => {
    let isMounted = true;

    // Timeout de segurança: garante no máximo 1400ms de loading inicial
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        setIsProfileComplete((prev) => (prev === null ? false : prev));
      }
    }, 1400);

    // Se estiver no Web e houver ?code= na URL (retorno de OAuth PKCE do Google)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code)
            .then(async ({ data, error }) => {
              if (error) console.warn('Erro ao trocar code no Web:', error);
              if (isMounted && data?.session) {
                setSession(data.session);
                await evaluateProfile(data.session);
                setIsLoading(false);
                clearTimeout(timer);
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            })
            .catch((e) => console.warn('Falha no exchangeCodeForSession Web:', e));
        }
      } catch (e) {
        console.warn('Erro ao ler URL de autenticação:', e);
      }
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          if (session) {
            await evaluateProfile(session);
          } else {
            setIsProfileComplete(null);
          }
          setIsLoading(false);
          clearTimeout(timer);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
          clearTimeout(timer);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        setSession(session);
        if (session) {
          await evaluateProfile(session);
        } else {
          setIsProfileComplete(null);
        }
        setIsLoading(false);
        clearTimeout(timer);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [evaluateProfile]);

  return (
    <AuthContext.Provider value={{ session, isLoading, isProfileComplete, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

