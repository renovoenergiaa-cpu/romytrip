import { Tabs, Redirect, useRouter } from 'expo-router';
import { Home, Users, MessageCircle, User, Plus } from 'lucide-react-native';
import { StyleSheet, View, DeviceEventEmitter, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brandGradient, useTheme } from '../../src/theme';
import { fontFamilyFor } from '../../src/theme/fonts';
import { useConversations } from '../../src/hooks/useMessenger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { BootSpinner, ConnectionError } from '../../src/components/AuthStates';

export default function TabLayout() {
  const router = useRouter();
  const { session, isLoading, loadError, retry } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: conversations } = useConversations();
  const unreadCount = conversations?.reduce((acc, curr) => acc + (curr.unread_count || 0), 0) || 0;

  if (!session) {
    if (isLoading && !loadError) return <BootSpinner />;
    // Sessão salva que não deu para renovar sem internet: não é logout.
    if (loadError) return <ConnectionError retrying={isLoading} onRetry={retry} />;
    return <Redirect href="/(auth)/login" />;
  }

  // iOS with home indicator needs bottom inset; works on both native and mobile Safari
  const isIos = Platform.OS === 'ios' || (Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent));
  const bottomPadding = insets.bottom > 0 ? insets.bottom : (isIos ? 20 : 8);
  const tabBarHeight = 62 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Com o teclado aberto as abas somem (senão sobem junto e roubam espaço do que se digita)
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: bottomPadding + 4,
          paddingTop: 6,
        },
        // A barra de abas usa o próprio Text do React Navigation: a fonte do Romy vai aqui
        tabBarLabelStyle: { fontFamily: fontFamilyFor('600') },
        tabBarBadgeStyle: {
          backgroundColor: colors.primary,
          color: '#FFFFFF',
          fontSize: 10,
          fontFamily: fontFamilyFor('700'),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Romy',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Conexões',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Criar publicação',
          tabBarIcon: () => (
            <View style={styles.createButtonContainer}>
              <LinearGradient
                colors={brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createGradient}
              >
                <Plus size={22} color="#FFFFFF" strokeWidth={2.75} />
              </LinearGradient>
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.navigate('/(tabs)');
            setTimeout(() => {
              DeviceEventEmitter.emit('openCreatePost');
            }, 120);
          },
        })}
      />
      <Tabs.Screen
        name="communities"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  createGradient: {
    width: 46,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6338FA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
});
