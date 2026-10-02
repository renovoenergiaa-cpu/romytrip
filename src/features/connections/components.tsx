import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../../components/ui/Text';
import { useTheme, type ThemeColors } from '../../theme';
import { Sheet } from '../../components/Sheet';
import { Avatar, ChoiceChip } from '../onboarding/components';
import { BUDGET_OPTIONS, GENDER_PREF_OPTIONS } from '../onboarding/options';
import { timeAgo } from '../feed/format';
import { ChatCircleDots } from '../onboarding/icons';
import type { GenderPref } from '../../hooks/useConnections';

const firstPart = (v?: string | null) => (v ? String(v).split(',')[0].trim() : '');
const nameOf = (v?: string | null) => String(v ?? '').trim() || 'Viajante';
// Cadastros antigos guardaram caminhos do aparelho (file://), que não abrem para mais ninguém
const remotePhoto = (photos?: string[] | null) => photos?.find((p) => /^https?:\/\//.test(p ?? '')) || undefined;

/* ─── Pedido recebido ──────────────────────────────────────────────────────── */

export function RequestCard({ request, busy, onOpen, onAccept, onDecline }: {
  request: any;
  busy: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => cardStyles(colors), [colors]);
  const person = request.users ?? {};
  const name = nameOf(person.name);
  const meta = [firstPart(person.city), timeAgo(request.created_at)].filter(Boolean).join(' · ');

  return (
    <View style={s.card}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${name}`} style={({ pressed }) => [s.who, pressed && { opacity: 0.7 }]}>
        <Avatar photo={remotePhoto(person.photos)} name={name} size={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <Text style={s.sub} numberOfLines={1}>Quer se conectar com você</Text>
          {meta ? <Text style={s.meta} numberOfLines={1}>{meta}</Text> : null}
        </View>
      </Pressable>
      <View style={s.actions}>
        <Pressable onPress={onDecline} disabled={busy} accessibilityRole="button" accessibilityLabel={`Recusar pedido de ${name}`} style={({ pressed }) => [s.btn, s.btnSoft, pressed && s.pressed, busy && s.off]}>
          <Text style={s.btnSoftText}>Recusar</Text>
        </Pressable>
        <Pressable onPress={onAccept} disabled={busy} accessibilityRole="button" accessibilityLabel={`Aceitar pedido de ${name}`} style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.pressed, busy && s.off]}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.btnPrimaryText}>Aceitar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const cardStyles = (c: ThemeColors) => StyleSheet.create({
  card: { padding: 16, gap: 14, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 17, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },
  sub: { fontSize: 15, color: c.textSecondary, marginTop: 1 },
  meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnSoft: { backgroundColor: c.surface },
  btnSoftText: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  btnPrimary: { backgroundColor: c.primary },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: c.onPrimary },
  pressed: { transform: [{ scale: 0.98 }] },
  off: { opacity: 0.6 },
});

/* ─── Conexão aceita ───────────────────────────────────────────────────────── */

export function ConnectionRow({ person, starting, onOpen, onChat }: {
  person: { id: string; name?: string | null; photos?: string[] | null; city?: string | null };
  starting: boolean;
  onOpen: () => void;
  onChat: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => rowStyles(colors), [colors]);
  const name = nameOf(person.name);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${name}`} style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <Avatar photo={remotePhoto(person.photos)} name={name} size={52} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        {person.city ? <Text style={s.city} numberOfLines={1}>{firstPart(person.city)}</Text> : null}
      </View>
      <Pressable onPress={onChat} disabled={starting} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Conversar com ${name}`} style={({ pressed }) => [s.chat, pressed && { transform: [{ scale: 0.96 }] }]}>
        {starting ? <ActivityIndicator color={colors.primary} /> : (
          <>
            <ChatCircleDots size={18} weight="duotone" color={colors.primary} />
            <Text style={s.chatText}>Conversar</Text>
          </>
        )}
      </Pressable>
    </Pressable>
  );
}

const rowStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 18 },
  pressed: { backgroundColor: c.surface },
  name: { fontSize: 17, fontWeight: '600', color: c.textPrimary, letterSpacing: -0.2 },
  city: { fontSize: 14, color: c.textSecondary, marginTop: 1 },
  chat: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.primarySoft, minWidth: 120, justifyContent: 'center' },
  chatText: { fontSize: 15, fontWeight: '700', color: c.primary },
});

/* ─── Aviso rápido no topo ─────────────────────────────────────────────────── */

export function Toast({ message, top }: { message: string; top: number }) {
  const { colors } = useTheme();
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [message, enter]);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute', top, alignSelf: 'center', maxWidth: '90%', paddingHorizontal: 16, height: 40, borderRadius: 999,
        justifyContent: 'center', backgroundColor: colors.textPrimary, zIndex: 50,
        opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.background }} numberOfLines={1}>{message}</Text>
    </Animated.View>
  );
}

/* ─── Filtros de Descobrir ─────────────────────────────────────────────────── */

export type DiscoverySettings = { gender: GenderPref; minAge: number; maxAge: number; budget: string; invisible: boolean };

export const AGE_RANGES = [
  { id: 'all', label: 'Qualquer idade', min: 18, max: 120 },
  { id: '18-25', label: '18 a 25', min: 18, max: 25 },
  { id: '26-35', label: '26 a 35', min: 26, max: 35 },
  { id: '36-50', label: '36 a 50', min: 36, max: 50 },
  { id: '51+', label: '51 ou mais', min: 51, max: 120 },
];
const BUDGETS = [{ id: 'all', label: 'Qualquer' }, ...BUDGET_OPTIONS.map(({ id, label }) => ({ id, label }))];

export function FiltersSheet({ visible, onClose, initial, saving, onApply }: {
  visible: boolean;
  onClose: () => void;
  /** Lido só ao montar: o pai troca a `key` a cada abertura */
  initial: DiscoverySettings;
  saving: boolean;
  onApply: (next: DiscoverySettings) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => filterStyles(colors), [colors]);
  const [draft, setDraft] = useState(initial);
  const set = (patch: Partial<DiscoverySettings>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Sheet visible={visible} onClose={saving ? () => {} : onClose} title="Filtros">
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 22, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.group}>
          <Text style={s.label}>Quem você quer ver</Text>
          <View style={s.chips}>
            {GENDER_PREF_OPTIONS.map((o) => (
              <ChoiceChip key={o.id} option={{ id: o.id, label: o.label }} selected={draft.gender === o.id} onPress={() => set({ gender: o.id as GenderPref })} />
            ))}
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.label}>Idade</Text>
          <View style={s.chips}>
            {AGE_RANGES.map((r) => (
              <ChoiceChip key={r.id} option={{ id: r.id, label: r.label }} selected={draft.minAge === r.min && draft.maxAge === r.max} onPress={() => set({ minAge: r.min, maxAge: r.max })} />
            ))}
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.label}>Orçamento de viagem</Text>
          <View style={s.chips}>
            {BUDGETS.map((b) => (
              <ChoiceChip key={b.id} option={b} selected={draft.budget === b.id} onPress={() => set({ budget: b.id })} />
            ))}
          </View>
        </View>

        <View style={s.invisible}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.invisibleTitle}>Modo invisível</Text>
            <Text style={s.invisibleText}>Você some de Descobrir para outras pessoas. Suas conexões continuam vendo seu perfil.</Text>
          </View>
          <Switch
            value={draft.invisible}
            onValueChange={(v) => set({ invisible: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Modo invisível"
          />
        </View>
      </ScrollView>

      <Pressable onPress={() => onApply(draft)} disabled={saving} accessibilityRole="button" style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
        {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.ctaText}>Aplicar filtros</Text>}
      </Pressable>
    </Sheet>
  );
}

const filterStyles = (c: ThemeColors) => StyleSheet.create({
  group: { gap: 10 },
  label: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  invisible: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: c.surface },
  invisibleTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  invisibleText: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  cta: { height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
});
