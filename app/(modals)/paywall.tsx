import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../../src/theme';
import { Crown, Translate, X } from '../../src/features/onboarding/icons';

// Ainda não há pagamento: a tela só avisa que o Premium vem aí. Nada de preço, selo ou recurso inventado.
export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'));

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={s.topBar}>
        <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fechar" style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}>
          <X size={22} weight="bold" color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={s.body}>
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.crown}>
          <Crown size={44} weight="fill" color="#FFFFFF" />
        </LinearGradient>

        <View style={s.soon}><Text style={s.soonText}>Em breve</Text></View>
        <Text style={s.title} accessibilityRole="header">Romy Premium</Text>
        <Text style={s.text}>
          Estamos preparando um plano para quem viaja muito e quer mais do Romy. Assim que ficar pronto, você vê por aqui.
        </Text>

        <View style={s.card}>
          <View style={s.cardIcon}><Translate size={24} weight="duotone" color={colors.primary} /></View>
          <View style={s.cardTexts}>
            <Text style={s.cardTitle}>Tradução com IA nas conversas</Text>
            <Text style={s.cardText}>Por enquanto ela está liberada para todo mundo. Toque em Traduzir numa mensagem recebida.</Text>
          </View>
        </View>
      </View>

      <View style={s.footer}>
        <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => [s.cta, pressed && s.pressed]}>
          <Text style={s.ctaText}>Entendi</Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  pressed: { transform: [{ scale: 0.98 }] },
  topBar: { paddingHorizontal: 20, alignItems: 'flex-end' },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  crown: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  soon: { height: 28, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.primarySoft, justifyContent: 'center' },
  soonText: { fontSize: 13, fontWeight: '700', color: c.primary, letterSpacing: 0.2 },
  title: { fontSize: 30, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 23, color: c.textSecondary, textAlign: 'center', maxWidth: 340 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, marginTop: 12, alignSelf: 'stretch',
    backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  cardIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTexts: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  cardText: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  footer: { paddingHorizontal: 20, paddingTop: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cta: {
    height: 56, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary, letterSpacing: -0.1 },
});
