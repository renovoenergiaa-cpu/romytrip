import { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../../theme';

export type FeedTab = 'aqui' | 'rolando' | 'comunidades' | 'ajudinha' | 'proximo';

export const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: 'aqui', label: 'Estou aqui' },
  { id: 'rolando', label: 'Tá rolando' },
  { id: 'comunidades', label: 'Comunidades' },
  { id: 'ajudinha', label: 'Ajudinha' },
  { id: 'proximo', label: 'Próxima' },
];

/** Altura da barra (sem a área segura do topo). */
export const FEED_TABS_HEIGHT = 48;

// Sobre foto ou mapa o texto é branco; nas outras abas usa as cores do tema
export function FeedTabs({ active, onChange, overMedia }: { active: FeedTab; onChange: (t: FeedTab) => void; overMedia: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => getStyles(colors), [colors]);
  const scroller = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});

  // Mantém a aba ativa à vista (nem todas cabem no celular)
  useEffect(() => {
    const x = positions.current[active];
    if (x !== undefined) scroller.current?.scrollTo({ x: Math.max(x - 24, 0), animated: true });
  }, [active]);

  const inactive = overMedia ? 'rgba(255,255,255,0.72)' : colors.textSecondary;
  const activeColor = overMedia ? '#FFFFFF' : colors.textPrimary;
  const underline = overMedia ? '#FFFFFF' : colors.primary;

  return (
    <View
      style={[
        s.bar,
        { paddingTop: insets.top },
        !overMedia && { backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
      pointerEvents="box-none"
    >
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} accessibilityRole="tablist">
        {FEED_TABS.map((t) => {
          const on = t.id === active;
          return (
            <Pressable
              key={t.id}
              onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); onChange(t.id); }}
              onLayout={(e) => { positions.current[t.id] = e.nativeEvent.layout.x; }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={s.tab}
            >
              <Text style={[s.label, { color: on ? activeColor : inactive }, overMedia && s.shadow, on && s.labelOn]}>{t.label}</Text>
              <View style={[s.underline, { backgroundColor: on ? underline : 'transparent' }]} />
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Sugere que a lista continua à direita */}
      <LinearGradient
        colors={overMedia ? ['transparent', 'rgba(0,0,0,0.55)'] : ['transparent', colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[s.fade, { top: insets.top }]}
        pointerEvents="none"
      />
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  row: { height: FEED_TABS_HEIGHT, paddingHorizontal: 16, gap: 20, alignItems: 'center' },
  tab: { height: FEED_TABS_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: -0.1 },
  labelOn: { fontWeight: '800' },
  shadow: { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  underline: { position: 'absolute', bottom: 4, height: 3, width: 22, borderRadius: 2 },
  fade: { position: 'absolute', right: 0, width: 36, height: FEED_TABS_HEIGHT },
});
