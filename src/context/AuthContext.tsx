import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Timeout de segurança: se a sessão demorar mais de 1.2s, libera a tela de loading
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 1200);

    // Busca a sessão inicial com tratamento de erro
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          setIsLoading(false);
          clearTimeout(timer);
        }
      })
      .catch((err) => {
        console.warn('Erro ao recuperar sessão:', err);
        if (isMounted) {
          setIsLoading(false);
          clearTimeout(timer);
        }
      });

    // Escuta mudanças de autenticação (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
