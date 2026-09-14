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
  // No web, iniciamos sem loading para evitar travamento.
  // No native (iOS/Android), iniciamos com loading para evitar flash de tela errada.
  const [isLoading, setIsLoading] = useState(Platform.OS !== 'web');

  useEffect(() => {
    let isMounted = true;

    // Timeout de segurança para native: garante máximo 800ms de loading
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (Platform.OS !== 'web') {
      timer = setTimeout(() => {
        if (isMounted) setIsLoading(false);
      }, 800);
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          setIsLoading(false);
          if (timer) clearTimeout(timer);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
          if (timer) clearTimeout(timer);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setIsLoading(false);
        if (timer) clearTimeout(timer);
      }
    });

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
