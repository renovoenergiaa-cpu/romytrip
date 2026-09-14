import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ybolfnlilxygcoaupygp.supabase.co';
export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlib2xmbmxpbHh5Z2NvYXVweWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjUxMzYsImV4cCI6MjA5NDIwMTEzNn0.45x9ZGIFYohq5d0TIwvjQH6T0UG4KSqhDtHJRlSbupk';

// Wrapper seguro para evitar erro de "window is not defined" no SSR (Server-Side Rendering) do Expo
const customStorage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
