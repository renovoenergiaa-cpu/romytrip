import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { CustomInput } from '../../src/components/CustomInput';
import { colors, spacing, typography } from '../../src/theme';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Redireciona declarativamente para tabs se já estiver autenticado
  if (session && !isSigningUp) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Aviso', 'Preencha email e senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      Alert.alert('Erro', error.message);
      setLoading(false);
    } else {
      // Explicitly redirect on success
      router.replace('/(tabs)');
    }
  };

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Aviso', 'Preencha email e senha para criar a conta.');
      return;
    }
    setLoading(true);
    setIsSigningUp(true); // Prevent useEffect from catching the session and redirecting
    const { error, data } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      setIsSigningUp(false);
      Alert.alert('Erro', error.message);
      setLoading(false);
    } else if (data.user) {
      if (!data.session) {
        Alert.alert(
          'Verifique seu e-mail',
          'Enviamos um link de confirmação para o seu e-mail. Por favor, acesse sua caixa de entrada e clique no link para ativar sua conta antes de fazer o login.'
        );
        setLoading(false);
        setIsSigningUp(false);
      } else {
        // Se a verificação de e-mail estiver desligada
        router.push('/(auth)/onboarding/step1-personal');
      }
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
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
          // Extrair tokens da URL (Supabase retorna no formato #access_token=...)
          const paramsString = res.url.split('#')[1];
          if (paramsString) {
            const params = paramsString.split('&').reduce((acc, current) => {
              const [key, value] = current.split('=');
              acc[key] = value;
              return acc;
            }, {} as Record<string, string>);
            
            if (params.access_token && params.refresh_token) {
              await supabase.auth.setSession({ 
                access_token: params.access_token, 
                refresh_token: params.refresh_token 
              });
              router.replace('/(tabs)');
            }
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || `Erro ao conectar com ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.subtitle}>Conecte-se com viajantes do mundo todo</Text>
      </View>

      <View style={styles.form}>
        <CustomInput 
          placeholder="Email" 
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
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Aguarde...' : 'Entrar'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignup} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Criar conta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.socialContainer}>
        <TouchableOpacity 
          style={styles.socialButton} 
          onPress={() => handleOAuthLogin('google')}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Continuar com Google</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.socialButton} 
          onPress={() => handleOAuthLogin('apple')}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Continuar com Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    gap: spacing.md,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  socialButtonText: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: '500',
  },
});
