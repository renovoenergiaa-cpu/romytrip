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
  Modal,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth, checkProfileComplete } from '../../src/context/AuthContext';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { CustomInput } from '../../src/components/CustomInput';
import { colors, spacing, typography } from '../../src/theme';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { session, isProfileComplete } = useAuth();
  const { updateField, reset: resetOnboarding } = useOnboardingStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Redireciona declarativamente se autenticado com perfil completo
  if (session && !isSigningUp && isProfileComplete === true) {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        showAlert('Erro ao entrar', translateAuthError(error));
        setLoading(false);
      } else if (data.user) {
        const complete = await checkProfileComplete(data.user.id);
        if (complete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding/step1-personal');
        }
      }
    } catch (err: any) {
      showAlert('Erro', translateAuthError(err));
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      showAlert('Aviso', 'Preencha o e-mail e crie uma senha para criar sua conta.');
      return;
    }
    if (password.length < 6) {
      showAlert('Senha Curta', 'A senha precisa ter pelo menos 6 caracteres.');
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
        // Criar ou atualizar registro base em public.users
        try {
          await supabase.from('users').upsert({
            id: data.user.id,
            email: data.user.email,
          });
        } catch (e) {
          console.warn('Erro ao criar registro de usuário:', e);
        }

        // Limpar o store para a nova criação de perfil
        resetOnboarding();

        // Seguir imediatamente para o onboarding tela a tela
        router.replace('/(auth)/onboarding/step1-personal');
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
          if (res.url.includes('error=')) {
            const errParam = res.url.match(/[?&#]error_description=([^&#]+)/);
            throw new Error(errParam ? decodeURIComponent(errParam[1]) : 'Autenticação cancelada ou com erro');
          }

          const codeMatch = res.url.match(/[?&#]code=([^&#]+)/);
          if (codeMatch && codeMatch[1]) {
            const code = decodeURIComponent(codeMatch[1]);
            const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            if (sessionData?.user) {
              const complete = await checkProfileComplete(sessionData.user.id);
              if (complete) {
                router.replace('/(tabs)');
              } else {
                const fullName = sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name;
                if (fullName) updateField('name', fullName);
                router.replace('/(auth)/onboarding/step1-personal');
              }
            } else {
              router.replace('/(tabs)');
            }
            return;
          }

          const hashOrQuery = res.url.includes('#') ? res.url.split('#')[1] : res.url.split('?')[1];
          if (hashOrQuery) {
            const params = hashOrQuery.split('&').reduce((acc, current) => {
              const [k, v] = current.split('=');
              if (k && v) acc[k] = decodeURIComponent(v);
              return acc;
            }, {} as Record<string, string>);

            if (params.access_token && params.refresh_token) {
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });
              if (sessionError) throw sessionError;
              if (sessionData?.user) {
                const complete = await checkProfileComplete(sessionData.user.id);
                if (complete) {
                  router.replace('/(tabs)');
                } else {
                  const fullName = sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name;
                  if (fullName) updateField('name', fullName);
                  router.replace('/(auth)/onboarding/step1-personal');
                }
              } else {
                router.replace('/(tabs)');
              }
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
                  ? 'Conecte-se com viajantes com a sua mesma sintonia'
                  : 'Monte seu perfil e encontre companhias de viagem reais'}
              </Text>
            </View>

            {/* Aviso de Cadastro em Andamento com Opção de Trocar de E-mail */}
            {session && isProfileComplete === false && (
              <View style={styles.resumeCard}>
                <Text style={styles.resumeText}>
                  Há um cadastro em andamento com:
                </Text>
                <Text style={styles.resumeEmail}>
                  {session.user?.email}
                </Text>
                <View style={styles.resumeBtnRow}>
                  <TouchableOpacity
                    style={styles.resumePrimaryBtn}
                    onPress={() => router.push('/(auth)/onboarding/step1-personal')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.resumePrimaryBtnText}>Continuar Cadastro →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resumeSecondaryBtn}
                    onPress={async () => {
                      try {
                        await supabase.auth.signOut();
                      } catch (e) {}
                      resetOnboarding();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.resumeSecondaryBtnText}>Sair / Trocar E-mail</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
              <CustomInput
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <CustomInput
                placeholder={mode === 'signup' ? 'Crie uma senha (mínimo 6 dígitos)' : 'Senha'}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

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
                    <Text style={styles.primaryButtonText}>Criar conta e montar perfil →</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Aviso de Consentimento LGPD */}
            {mode === 'signup' && (
              <View style={styles.lgpdNoticeContainer}>
                <Text style={styles.lgpdNoticeText}>
                  Ao criar sua conta, você concorda com nossos{' '}
                  <Text style={styles.lgpdLinkText} onPress={() => setShowPrivacyModal(true)}>
                    Termos de Uso e Política de Privacidade (LGPD)
                  </Text>.
                </Text>
              </View>
            )}

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

      {/* Modal de Termos de Uso e LGPD */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent={true} onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.privacyModalOverlay}>
          <View style={styles.privacyModalCard}>
            <View style={styles.privacyModalHeader}>
              <Text style={styles.privacyModalTitle}>Privacidade & LGPD</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.privacyModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.privacySectionTitle}>Compromisso com sua Privacidade</Text>
              <Text style={styles.privacyText}>
                O Romy trata seus dados pessoais em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
              </Text>

              <Text style={styles.privacySectionTitle}>1. Quais dados coletamos?</Text>
              <Text style={styles.privacyText}>
                • Dados de Identificação: Nome, e-mail e fotos de perfil.{'\n'}
                • Dados de Viagem: Destinos, datas e estilo de viagem.{'\n'}
                • Geolocalização aproximada: Somente para exibir viajantes próximos, sem expor coordenadas exatas a terceiros.
              </Text>

              <Text style={styles.privacySectionTitle}>2. Para que usamos seus dados?</Text>
              <Text style={styles.privacyText}>
                Conectar viajantes com interesses em comum, recomendar itinerários e garantir a segurança coletiva (especialmente para viajantes mulheres solo).
              </Text>

              <Text style={styles.privacySectionTitle}>3. Seus Direitos (Art. 18 da LGPD)</Text>
              <Text style={styles.privacyText}>
                Você pode a qualquer momento:{'\n'}
                • Acessar e retificar seus dados nas configurações.{'\n'}
                • Excluir sua conta com eliminação das fotos e anonimização do perfil.{'\n'}
                • Revogar permissões a qualquer instante.
              </Text>

              <Text style={styles.privacySectionTitle}>4. Segurança da Informação</Text>
              <Text style={styles.privacyText}>
                Seus dados são protegidos por criptografia e políticas estritas de acesso (Row Level Security), impedindo acessos não autorizados.
              </Text>

              <View style={{ height: 20 }} />
            </ScrollView>
            <TouchableOpacity 
              style={styles.privacyCloseButton} 
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.privacyCloseButtonText}>Entendi e Concordo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  lgpdNoticeContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  lgpdNoticeText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  lgpdLinkText: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  privacyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  privacyModalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  privacyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  privacyModalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontSize: 20,
  },
  privacyModalBody: {
    marginVertical: spacing.sm,
  },
  privacySectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 15,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  privacyText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  privacyCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  privacyCloseButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  resumeCard: {
    backgroundColor: 'rgba(99, 56, 250, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 56, 250, 0.25)',
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  resumeText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resumeEmail: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  resumeBtnRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  resumePrimaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resumePrimaryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resumeSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  resumeSecondaryBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
