import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, Component } from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme';
import { GlobalNotificationProvider } from '../src/context/GlobalNotificationContext';
import { IncomingCallBanner } from '../src/components/IncomingCallBanner';
import { InAppMessageBanner } from '../src/components/InAppMessageBanner';
import { StatusBar } from 'expo-status-bar';

// Captura erros silenciosos e exibe a mensagem — essencial para depurar tela branca no web
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0c', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
            ⚠️ Erro no App
          </Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace' }}>
              {/* 🔒 SECURITY: Only expose error details in development */}
              {__DEV__ ? this.state.error?.message : 'Ocorreu um erro inesperado. Por favor, reinicie o aplicativo.'}
            </Text>
            {/* Stack trace: only visible in dev builds, never in production */}
            {__DEV__ && (
              <Text style={{ color: '#888', fontSize: 11, marginTop: 12, fontFamily: 'monospace' }}>
                {this.state.error?.stack}
              </Text>
            )}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}


function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleNavigateToChat = (conversationId: string, options?: { autoAcceptCall?: boolean; callType?: 'voice' | 'video' }) => {
    if (options?.autoAcceptCall) {
      router.push({
        pathname: `/chat/${conversationId}`,
        params: { autoAcceptCall: 'true', callType: options.callType || 'voice' },
      } as any);
    } else {
      router.push(`/chat/${conversationId}` as any);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {/* Global banners float on top of every screen */}
      <IncomingCallBanner onNavigate={handleNavigateToChat} />
      <InAppMessageBanner onNavigate={handleNavigateToChat} />
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const { isDark } = useTheme();

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GlobalNotificationProvider>
              <AppShell>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(modals)" options={{ presentation: 'modal', headerShown: false }} />
                </Stack>
              </AppShell>
            </GlobalNotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
