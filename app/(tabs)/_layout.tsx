import { Tabs, Redirect } from 'expo-router';
import { Home, Users, MessageCircle, User, Plus } from 'lucide-react-native';
import { StyleSheet, View, DeviceEventEmitter, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme';
import { useConversations } from '../../src/hooks/useMessenger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
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

  // iOS with home indicator needs ~83px total; Android stays at 60px
  const tabBarHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 60;

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
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
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
            DeviceEventEmitter.emit('openCreatePost');
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
    marginTop: 6,
  },
  createGradient: {
    width: 44,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#6338FA',
    borderRightWidth: 3,
    borderRightColor: '#D936B4',
  },
  createGradientDark: {
    backgroundColor: '#2A2A2A',
  },
});
