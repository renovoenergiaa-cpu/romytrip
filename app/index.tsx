import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';
import { BootSpinner, ConnectionError } from '../src/components/AuthStates';

export default function Index() {
  const { session, isLoading, isProfileComplete, loadError, retry } = useAuth();

  // Sem conexão não é "deslogado" nem "cadastro incompleto": pede para tentar de novo.
  if (loadError) {
    return (
      <ConnectionError
        retrying={isLoading}
        onRetry={retry}
        onSignOut={session ? () => { supabase.auth.signOut().catch(() => {}); } : undefined}
      />
    );
  }

  if (isLoading || (session && isProfileComplete === null)) return <BootSpinner />;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isProfileComplete === false) {
    return <Redirect href="/(auth)/onboarding/step1-personal" />;
  }

  return <Redirect href="/(tabs)" />;
}
