import { useEffect } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Só redireciona quando o navigator raiz estiver montado
    if (!navigationState?.key) return;
    router.replace('/(auth)/login');
  }, [navigationState?.key]);

  // Retorna vazio enquanto aguarda o navigator montar
  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
