import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { KeyRound } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { CustomInput } from '../../src/components/CustomInput';
import { spacing, typography, useTheme, type ThemeColors } from '../../src/theme';

// Destino do link "Esqueci minha senha". No web o supabase-js já cria a sessão de
// recuperação a partir da URL (detectSessionInUrl); no app nativo lemos o deep link.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const url = Linking.useURL();

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS !== 'web' && url) {
        const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
        const params = new URLSearchParams(fragment);
        const code = params.get('code');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (code) await supabase.auth.exchangeCodeForSession(code);
        else if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setHasSession(!!data.session);
    })();
    return () => { cancelled = true; };
  }, [url]);

  const handleSave = async () => {
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError('Não foi possível salvar a nova senha. Peça um novo link e tente de novo.');
      return;
    }
    if (Platform.OS !== 'web') Alert.alert('Senha alterada', 'Sua nova senha já está valendo.');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <View style={styles.iconWrap}>
            <KeyRound size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>Criar nova senha</Text>

          {hasSession === null ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
          ) : !hasSession ? (
            <>
              <Text style={styles.subtitle}>
                Este link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.primaryButtonText}>Voltar para o login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>Escolha uma senha com pelo menos 6 caracteres.</Text>
              <CustomInput
                placeholder="Nova senha"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                accessibilityLabel="Nova senha"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
              />
              <CustomInput
                placeholder="Repita a nova senha"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                accessibilityLabel="Repita a nova senha"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(null); }}
                onSubmitEditing={handleSave}
                error={error ?? undefined}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>Salvar nova senha</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: { ...typography.body, fontWeight: '700', color: colors.onPrimary },
});
