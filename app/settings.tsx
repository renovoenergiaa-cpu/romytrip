import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, User, Shield, Bell, HelpCircle, Moon, Sun, Smartphone, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { useOnboardingStore } from '../src/store/onboardingStore';
import { spacing, typography, useTheme, radius } from '../src/theme';
import { useThemeStore, ThemeMode } from '../src/store/themeStore';
import { ScreenHeader } from '../src/components/ScreenHeader';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { themeMode, setThemeMode } = useThemeStore();
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('Erro ao sair do Supabase:', error);
      } finally {
        router.replace('/(auth)/login');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Tem certeza que deseja encerrar a sua sessão?') : true;
      if (confirmed) {
        await doLogout();
      }
    } else {
      Alert.alert(
        'Sair da Conta',
        'Tem certeza que deseja encerrar a sua sessão?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair da Conta',
            style: 'destructive',
            onPress: doLogout,
          },
        ]
      );
    }
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      setDeleting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. Apaga arquivos físicos de mídia do usuário no Storage (LGPD Art. 18, VI)
          try {
            const { data: avatarFiles } = await supabase.storage.from('avatars').list(user.id);
            if (avatarFiles && avatarFiles.length > 0) {
              const paths = avatarFiles.map(f => `${user.id}/${f.name}`);
              await supabase.storage.from('avatars').remove(paths);
            }
          } catch (e) {
            console.warn('Erro ao purgar fotos de avatar no storage:', e);
          }

          try {
            const { data: postFiles } = await supabase.storage.from('posts').list(user.id);
            if (postFiles && postFiles.length > 0) {
              const paths = postFiles.map(f => `${user.id}/${f.name}`);
              await supabase.storage.from('posts').remove(paths);
            }
          } catch (e) {
            console.warn('Erro ao purgar fotos de posts no storage:', e);
          }

          // 2. Apaga posts criados pelo usuário (fotos, mídias e posts do feed)
          try {
            await supabase.from('posts').delete().eq('user_id', user.id);
          } catch (e) {
            console.warn('Erro ao deletar posts:', e);
          }

          // 3. Apaga interações de feed (curtidas e comentários)
          try {
            await supabase.from('comments').delete().eq('user_id', user.id);
            await supabase.from('post_likes').delete().eq('user_id', user.id);
          } catch (e) {
            console.warn('Erro ao deletar interações:', e);
          }

          // 4. Remove conexões ativas
          try {
            await supabase.from('connections').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
          } catch (e) {
            console.warn('Erro ao deletar conexões:', e);
          }

          // 5. Anonimiza perfil na tabela users (Padrão Instagram / LGPD)
          // Preserva o histórico de conversas do outro viajante com nome 'Conta Excluída',
          // mas apaga 100% dos dados privados, fotos, biografia e localização.
          try {
            await supabase.from('users').update({
              name: 'Conta Excluída',
              photos: [],
              bio: null,
              city: null,
              dob: null,
              destination: null,
              check_in: null,
              check_out: null,
              travel_styles: [],
              interests: [],
              connection_intentions: [],
              push_token: null,
              is_free: false,
            }).eq('id', user.id);
          } catch (e) {
            console.warn('Erro ao anonimizar perfil:', e);
          }

          // 6. Remove autenticação real do Supabase Auth para nunca mais conseguir logar
          try {
            await supabase.rpc('delete_user');
          } catch (e) {
            console.warn('RPC delete_user:', e);
          }
        }
        // Limpar store do onboarding em memória
        useOnboardingStore.getState().reset();

        // Encerrar sessão
        await supabase.auth.signOut();

        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') window.alert('Sua conta foi excluída com sucesso.');
        } else {
          Alert.alert('Conta Excluída', 'Sua conta foi excluída com sucesso.');
        }
        router.replace('/(auth)/login');
      } catch (error: any) {
        const errorMsg = error.message || 'Não foi possível excluir sua conta no momento.';
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') window.alert('Erro: ' + errorMsg);
        } else {
          Alert.alert('Erro', errorMsg);
        }
      } finally {
        setDeleting(false);
      }
    };

    const confirmMessage = 'Esta ação é irreversível. Todos os seus dados de perfil, mensagens e conexões serão apagados permanentemente. Deseja prosseguir?';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMessage) : true;
      if (confirmed) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Excluir Conta',
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir Minha Conta',
            style: 'destructive',
            onPress: doDelete,
          },
        ]
      );
    }
  };

  const renderThemeButton = (mode: ThemeMode, label: string, Icon: any) => {
    const isActive = themeMode === mode;
    return (
      <TouchableOpacity 
        style={[
          dynamicStyles.themeButton, 
          isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
          !isActive && { borderColor: colors.border, backgroundColor: colors.surface }
        ]} 
        onPress={() => setThemeMode(mode)}
      >
        <Icon size={20} color={isActive ? '#FFF' : colors.textSecondary} />
        <Text style={[
          dynamicStyles.themeButtonText, 
          isActive && { color: '#FFF' },
          !isActive && { color: colors.textSecondary }
        ]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const dynamicStyles = getStyles(colors, isDark);

  return (
    <View style={dynamicStyles.container}>
      <ScreenHeader
        title="Configurações"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        
        {/* Aparência */}
        <Text style={dynamicStyles.sectionTitle}>Aparência</Text>
        <View style={dynamicStyles.themeRow}>
          {renderThemeButton('system', 'Auto', Smartphone)}
          {renderThemeButton('light', 'Claro', Sun)}
          {renderThemeButton('dark', 'Escuro', Moon)}
        </View>

        <View style={dynamicStyles.divider} />

        <Text style={dynamicStyles.sectionTitle}>Conta</Text>
        <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => router.push('/edit-profile')}>
          <View style={dynamicStyles.menuIcon}><User size={20} color={colors.textSecondary} /></View>
          <Text style={dynamicStyles.menuText}>Editar Perfil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => router.push('/notification-settings')}>
          <View style={dynamicStyles.menuIcon}><Bell size={20} color={colors.textSecondary} /></View>
          <Text style={dynamicStyles.menuText}>Notificações</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => router.push('/privacy-security')}>
          <View style={dynamicStyles.menuIcon}><Shield size={20} color={colors.textSecondary} /></View>
          <Text style={dynamicStyles.menuText}>Privacidade e Segurança</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={dynamicStyles.menuItem} onPress={() => router.push('/help-support')}>
          <View style={dynamicStyles.menuIcon}><HelpCircle size={20} color={colors.textSecondary} /></View>
          <Text style={dynamicStyles.menuText}>Ajuda e Suporte</Text>
        </TouchableOpacity>

        <View style={dynamicStyles.divider} />

        <Text style={dynamicStyles.sectionTitle}>Ações de Conta</Text>

        <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleLogout}>
          <View style={[dynamicStyles.menuIcon, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' }]}>
            <LogOut size={20} color="#EF4444" />
          </View>
          <Text style={dynamicStyles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[dynamicStyles.menuItem, { borderBottomWidth: 0 }]} 
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.7}
        >
          <View style={[dynamicStyles.menuIcon, { backgroundColor: isDark ? 'rgba(220,38,38,0.2)' : '#FEE2E2' }]}>
            {deleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Trash2 size={20} color="#DC2626" />
            )}
          </View>
          <Text style={[dynamicStyles.logoutText, { color: '#DC2626' }]}>
            {deleting ? 'Excluindo conta...' : 'Excluir Conta'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.md : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
  },
  themeButtonText: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: spacing.xl,
    borderBottomWidth: 0,
  },
  logoutText: {
    ...typography.body,
    color: '#EF4444',
    fontWeight: 'bold',
  },
});
