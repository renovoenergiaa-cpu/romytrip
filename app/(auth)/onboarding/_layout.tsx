import { Stack } from 'expo-router';

// Todo o cadastro vive numa rota só (uma pergunta por tela, controlada pelo OnboardingFlow).
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="step1-personal" />
    </Stack>
  );
}
