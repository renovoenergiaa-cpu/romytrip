import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme';
import { GlobalNotificationProvider } from '../src/context/GlobalNotificationContext';
import { IncomingCallBanner } from '../src/components/IncomingCallBanner';
import { InAppMessageBanner } from '../src/components/InAppMessageBanner';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [session, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalNotificationProvider>
          <AuthGuard>
            <AppShell>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(modals)" options={{ presentation: 'modal', headerShown: false }} />
              </Stack>
            </AppShell>
          </AuthGuard>
        </GlobalNotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
