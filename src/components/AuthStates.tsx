import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../theme';
import { WifiSlash } from '../features/onboarding/icons';

/** Tela de espera da abertura do app: só o fundo do tema e um indicador discreto. */
export function BootSpinner() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando" />
    </View>
  );
}

/** Não deu para confirmar a conta por falta de conexão. A sessão continua salva. */
export function ConnectionError({
  retrying,
  onRetry,
  onSignOut,
}: {
  retrying: boolean;
  onRetry: () => void;
  onSignOut?: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={s.body}>
        <View style={s.iconTile}>
          <WifiSlash size={40} weight="duotone" color={colors.primary} />
        </View>
        <Text style={s.title} accessibilityRole="header">Sem sinal por aqui</Text>
        <Text style={s.text}>
          Não conseguimos abrir o Romy agora. Confira sua internet e tente de novo, sua conta continua salva.
        </Text>
      </View>

      <View style={s.footer}>
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          style={({ pressed }) => [s.cta, retrying && s.ctaBusy, pressed && !retrying && { transform: [{ scale: 0.98 }] }]}
        >
          {retrying ? (
            <View style={s.ctaInner}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={[s.ctaText, s.ctaTextBusy]}>Tentando de novo…</Text>
            </View>
          ) : (
            <Text style={s.ctaText}>Tentar de novo</Text>
          )}
        </Pressable>
        {onSignOut && (
          <Pressable onPress={onSignOut} accessibilityRole="button" style={s.secondary} hitSlop={8}>
            <Text style={s.secondaryText}>Entrar com outra conta</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  iconTile: {
    width: 80, height: 80, borderRadius: 28, backgroundColor: c.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 23, color: c.textSecondary, textAlign: 'center', maxWidth: 340 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 6, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cta: {
    height: 56, borderRadius: 18, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4,
  },
  ctaBusy: { backgroundColor: c.surface, shadowOpacity: 0, elevation: 0 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary, letterSpacing: -0.1 },
  ctaTextBusy: { color: c.textMuted },
  secondary: { height: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
});
