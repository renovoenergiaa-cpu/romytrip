import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="step1-personal" />
      <Stack.Screen name="step2-trip" />
      <Stack.Screen name="step3-travelstyle" />
      <Stack.Screen name="step4-interests" />
      <Stack.Screen name="step5-social" />
      <Stack.Screen name="step6-connections" />
    </Stack>
  );
}
