import { Tabs, Redirect, useRouter } from 'expo-router';
import { Home, Users, MessageCircle, User, Plus } from 'lucide-react-native';
import { StyleSheet, View, DeviceEventEmitter, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme';
import { useConversations } from '../../src/hooks/useMessenger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: conversations } = useConversations();
  const unreadCount = conversations?.reduce((acc, curr) => acc + (curr.unread_count || 0), 0) || 0;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
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
        tabBarBadgeStyle: {
          backgroundColor: colors.primary,
          color: '#FFFFFF',
          fontSize: 10,
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
          tabBarIcon: () => (
            <View style={styles.createButtonContainer}>
              <View style={[styles.createGradient, isDark && styles.createGradientDark]}>
                <Plus size={22} color={isDark ? '#FFF' : '#000'} strokeWidth={3} />
              </View>
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
    width: 44,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#6338FA',
    borderRightWidth: 3,
    borderRightColor: '#D936B4',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomColor: '#E5E7EB',
  },
  createGradientDark: {
    backgroundColor: '#2A2A2A',
    borderTopColor: '#3A3A3C',
    borderBottomColor: '#3A3A3C',
  },
});
