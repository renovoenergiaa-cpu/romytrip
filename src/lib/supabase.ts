import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Só carrega o polyfill no nativo — no web, a URL API já existe nativamente
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// Configuração pública do Supabase para Web e Mobile.
// A URL e a Anon Key são parâmetros públicos do cliente frontend (necessários para conexão no browser).
// A segurança real dos dados é 100% garantida pelas políticas RLS (Row Level Security) no banco de dados.
export const supabaseUrl: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ybolfnlilxygcoaupygp.supabase.co';

export const supabaseAnonKey: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlib2xmbmxpbHh5Z2NvYXVweWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjUxMzYsImV4cCI6MjA5NDIwMTEzNn0.45x9ZGIFYohq5d0TIwvjQH6T0UG4KSqhDtHJRlSbupk';

// Storage compatível tanto para Web (localStorage / seguro no SSR) quanto Mobile (AsyncStorage)
const isWeb = Platform.OS === 'web';
const isBrowser = typeof window !== 'undefined';

const authStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      if (!isBrowser) return null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (!isBrowser) return;
      try {
        window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (!isBrowser) return;
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb && isBrowser,
  },
});
