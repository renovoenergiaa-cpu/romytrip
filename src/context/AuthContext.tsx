import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: false, // começa como false — web não bloqueia na inicialização
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Timeout de segurança: garante no máximo 1200ms de loading inicial em qualquer plataforma
    const timer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 1200);

    // Se estiver no Web e houver ?code= na URL (retorno de OAuth PKCE do Google)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code)
            .then(({ data, error }) => {
              if (error) console.warn('Erro ao trocar code no Web:', error);
              if (isMounted && data?.session) {
                setSession(data.session);
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
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setIsLoading(false);
        clearTimeout(timer);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
