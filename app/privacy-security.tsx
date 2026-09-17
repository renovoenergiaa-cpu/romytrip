import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Modal, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView, 
  Platform, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, Eye, MapPin, Key, Smartphone, CheckCircle, X } from 'lucide-react-native';
import { supabase } from '../src/lib/supabase';
import { spacing, typography, useTheme } from '../src/theme';

// Default privacy settings (most permissive = safe default for UX)
const DEFAULT_PRIVACY = {
  publicProfile: true,
  showLocation: true,
  showDestination: true,
  onlineStatus: true,
  allowDirectMessages: true,
};

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  // 🔒 SECURITY FIX (V-07): Privacy settings are now persisted in the database.
  // Previously these were local useState values that reset on every app restart,
  // giving users a false sense of privacy control (LGPD violation - Art. 18).
  const [privacySettings, setPrivacySettings] = useState(DEFAULT_PRIVACY);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Password Modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load persisted privacy settings from Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('users')
          .select('privacy_settings')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data?.privacy_settings) {
          setPrivacySettings({ ...DEFAULT_PRIVACY, ...data.privacy_settings });
        }
      } catch (e) {
        console.warn('Erro ao carregar configurações de privacidade:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Persist a single privacy toggle change to Supabase
  const handleToggle = useCallback(async (key: keyof typeof DEFAULT_PRIVACY, value: boolean) => {
    const updated = { ...privacySettings, [key]: value };
    setPrivacySettings(updated);
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('users')
        .update({ privacy_settings: updated })
        .eq('id', user.id);
      if (error) throw error;
    } catch (e: any) {
      // Rollback on failure
      setPrivacySettings(privacySettings);
      Alert.alert('Erro', 'Não foi possível salvar a configuração. Tente novamente.');
      console.warn('Erro ao salvar privacidade:', e);
    } finally {
      setIsSaving(false);
    }
  }, [privacySettings]);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert('Sucesso', 'Sua senha foi alterada com sucesso!');
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível alterar a senha.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderToggleItem = (
    title: string,
    subtitle: string,
    settingKey: keyof typeof DEFAULT_PRIVACY,
    IconComponent: any
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIconContainer}>
        <IconComponent size={20} color={colors.primary} />
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={privacySettings[settingKey]}
        onValueChange={(val) => handleToggle(settingKey, val)}
        disabled={isSaving || isLoading}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={privacySettings[settingKey] ? colors.primary : '#F4F3F4'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidade e Segurança</Text>
        <View style={{ width: 28, alignItems: 'center' }}>
          {(isSaving || isLoading) && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Privacidade */}
        <Text style={styles.sectionTitle}>Privacidade do Perfil</Text>

        {renderToggleItem(
          'Perfil Visível',
          'Permitir que outros viajantes encontrem seu perfil na busca',
          'publicProfile',
          Eye
        )}

        {renderToggleItem(
          'Mostrar Cidade no Perfil',
          'Exibir sua cidade de origem para a comunidade',
          'showLocation',
          MapPin
        )}

        {renderToggleItem(
          'Mostrar Próximo Destino',
          'Permitir que outros vejam para onde você pretende viajar',
          'showDestination',
          Shield
        )}

        {renderToggleItem(
          'Status Online',
          'Mostrar aos seus amigos quando você estiver ativo no aplicativo',
          'onlineStatus',
          CheckCircle
        )}

        <View style={styles.divider} />

        {/* Segurança */}
        <Text style={styles.sectionTitle}>Segurança da Conta</Text>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setPasswordModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuButtonLeft}>
            <View style={styles.toggleIconContainer}>
              <Key size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.toggleTitle}>Alterar Senha</Text>
              <Text style={styles.toggleSubtitle}>Atualize sua senha de acesso à conta</Text>
            </View>
          </View>
          <ChevronLeft size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Smartphone size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.infoText}>
            Sua conta está protegida com criptografia de ponta a ponta e conexões seguras SSL.
          </Text>
        </View>
      </ScrollView>

      {/* Password Modal */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Senha</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Nova Senha</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                placeholder="Repita a nova senha"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Atualizar Senha</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  scrollContent: {
    padding: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  toggleTitle: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  toggleSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.textPrimary,
  },
  modalForm: {
    gap: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
