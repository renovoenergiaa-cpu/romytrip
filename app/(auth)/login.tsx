import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { CustomInput } from '../../src/components/CustomInput';
import { colors, spacing, typography } from '../../src/theme';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { updateField } = useOnboardingStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Redireciona declarativamente para tabs se já estiver autenticado e não estiver criando conta
  if (session && !isSigningUp) {
    return <Redirect href="/(tabs)" />;
  }

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.alert(`${title}: ${message}`);
      }
    } else {
      Alert.alert(title, message);
    }
  };

  const translateAuthError = (err: any): string => {
    const msg = err?.message || String(err);
    if (msg.includes('User already registered') || msg.includes('user_already_exists')) {
      return 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
    }
    if (msg.includes('Password should be at least 6 characters')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Por favor, confirme seu e-mail pelo link enviado antes de entrar.';
    }
    if (msg.includes('invalid format') || msg.includes('Unable to validate email address')) {
      return 'Por favor, insira um formato de e-mail válido.';
    }
    if (msg.includes('Network request failed') || msg.includes('fetch')) {
      return 'Falha de conexão com o servidor. Verifique sua internet.';
    }
    return msg;
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      showAlert('Aviso', 'Preencha o e-mail e a senha para entrar.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        showAlert('Erro ao entrar', translateAuthError(error));
        setLoading(false);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      showAlert('Erro', translateAuthError(err));
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      showAlert('Aviso', 'Preencha todos os campos obrigatórios para criar sua conta.');
      return;
    }
    if (password.length < 6) {
      showAlert('Senha Curta', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Senhas não coincidem', 'A confirmação de senha precisa ser igual à senha digitada.');
      return;
    }

    setLoading(true);
    setIsSigningUp(true);

    try {
      const redirectUrl =
        Platform.OS === 'web'
          ? typeof window !== 'undefined'
            ? window.location.origin
            : undefined
          : Linking.createURL('/');

      const { error, data } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName || undefined,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setIsSigningUp(false);
        showAlert('Erro ao criar conta', translateAuthError(error));
        setLoading(false);
        return;
      }

      if (data.user) {
        if (cleanName) {
          updateField('name', cleanName);
        }

        if (!data.session) {
          showAlert(
            'Verifique seu e-mail',
            'Enviamos um link de confirmação para o seu e-mail. Por favor, acesse sua caixa de entrada e clique no link para ativar sua conta antes de fazer o login.'
          );
          setLoading(false);
          setIsSigningUp(false);
        } else {
          // Criar ou atualizar registro em public.users
          try {
            await supabase.from('users').upsert({
              id: data.user.id,
              email: data.user.email,
              name: cleanName || null,
            });
          } catch (e) {
            console.warn('Erro ao criar perfil inicial:', e);
          }

          // Seguir para o onboarding
          router.replace('/(auth)/onboarding/step1-personal');
        }
      }
    } catch (err: any) {
      setIsSigningUp(false);
      showAlert('Erro', translateAuthError(err));
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);

      if (Platform.OS === 'web') {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: origin,
          },
        });
        if (error) throw error;
        return;
      }

      // Fluxo Nativo (iOS / Android)
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (res.type === 'success' && res.url) {
          // 1. Checa se o provedor retornou erro
          if (res.url.includes('error=')) {
            const errParam = res.url.match(/[?&#]error_description=([^&#]+)/);
            throw new Error(errParam ? decodeURIComponent(errParam[1]) : 'Autenticação cancelada ou com erro');
          }

          // 2. Fluxo PKCE (Supabase v2 padrão): ?code=...
          const codeMatch = res.url.match(/[?&#]code=([^&#]+)/);
          if (codeMatch && codeMatch[1]) {
            const code = decodeURIComponent(codeMatch[1]);
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            router.replace('/(tabs)');
            return;
          }

          // 3. Fluxo Implícito: #access_token=...&refresh_token=...
          const hashOrQuery = res.url.includes('#') ? res.url.split('#')[1] : res.url.split('?')[1];
          if (hashOrQuery) {
            const params = hashOrQuery.split('&').reduce((acc, current) => {
              const [k, v] = current.split('=');
              if (k && v) acc[k] = decodeURIComponent(v);
              return acc;
            }, {} as Record<string, string>);

            if (params.access_token && params.refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });
              if (sessionError) throw sessionError;
              router.replace('/(tabs)');
              return;
            }
          }
        }
      }
    } catch (err: any) {
      showAlert('Erro', translateAuthError(err) || `Erro ao conectar com ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.innerCard}>
            {/* Header */}
            <View style={styles.header}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>
                {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'login'
                  ? 'Conecte-se com viajantes do mundo todo'
                  : 'Junte-se à comunidade e descubra novas viagens'}
              </Text>
            </View>

            {/* Alternador de Modo (Abas) */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
                onPress={() => setMode('login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'signup' && styles.tabButtonActive]}
                onPress={() => setMode('signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                  Criar Conta
                </Text>
              </TouchableOpacity>
            </View>

            {/* Formulário */}
            <View style={styles.form}>
              {mode === 'signup' && (
                <CustomInput
                  placeholder="Seu nome completo"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                />
              )}

              <CustomInput
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <CustomInput
                placeholder="Senha"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {mode === 'signup' && (
                <>
                  <CustomInput
                    placeholder="Confirmar senha"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <Text style={styles.passwordHint}>
                    Mínimo de 6 caracteres para sua senha.
                  </Text>
                </>
              )}

              {mode === 'login' ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Entrar</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSignup}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Criar minha conta</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Divisor */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou continue com</Text>
              <View style={styles.divider} />
            </View>

            {/* Botões Sociais */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOAuthLogin('google')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOAuthLogin('apple')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Alternador inferior */}
            <TouchableOpacity
              style={styles.bottomSwitch}
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              <Text style={styles.bottomSwitchText}>
                {mode === 'login' ? (
                  <>
                    Não tem uma conta?{' '}
                    <Text style={styles.bottomSwitchHighlight}>Cadastre-se</Text>
                  </>
                ) : (
                  <>
                    Já possui uma conta?{' '}
                    <Text style={styles.bottomSwitchHighlight}>Fazer login</Text>
                  </>
                )}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  innerCard: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 76,
    height: 76,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  form: {
    marginBottom: spacing.md,
  },
  passwordHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    ...typography.caption,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  socialButtonText: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: '600',
  },
  bottomSwitch: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bottomSwitchText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  bottomSwitchHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
});
