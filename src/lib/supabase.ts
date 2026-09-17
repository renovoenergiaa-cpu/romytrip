import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Só carrega o polyfill no nativo — no web, a URL API já existe nativamente
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// SECURITY: Never use hardcoded fallback values for secrets.
// If these variables are missing, the app should fail explicitly.
const _supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const _supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!_supabaseUrl || !_supabaseAnonKey) {
  throw new Error(
    '[Romy] Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Check your .env file and ensure variables are prefixed with EXPO_PUBLIC_.'
  );
}

export const supabaseUrl: string = _supabaseUrl;
export const supabaseAnonKey: string = _supabaseAnonKey;

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
