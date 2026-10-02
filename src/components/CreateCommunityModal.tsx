import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ui/Text';
import { Sheet } from './Sheet';
import { useTheme, type ThemeColors } from '../theme';
import { useCreateCommunity } from '../hooks/useCommunities';
import { CityAutocomplete } from './CityAutocomplete';
import { CustomDatePicker } from './CustomDatePicker';
import { showError } from '../lib/dialogs';
import { Clock, Globe, LockSimple, Users, type Icon } from '../features/onboarding/icons';

// `value` é gravado no banco (communities.type): NÃO alterar os nomes
const TYPES: { value: string; label: string; text: string; icon: Icon; color: string; bg: string }[] = [
  { value: 'Pública', label: 'Pública', text: 'Qualquer pessoa pode entrar', icon: Users, color: '#10B981', bg: '#D1FAE5' },
  { value: 'Privada', label: 'Privada', text: 'Só entra quem for convidado', icon: LockSimple, color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'Internacional', label: 'Internacional', text: 'Para viajantes do mundo todo', icon: Globe, color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'Temporária', label: 'Temporária', text: 'Some numa data que você escolhe', icon: Clock, color: '#A855F7', bg: '#F3E8FF' },
];

export default function CreateCommunityModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Pública');
  const [location, setLocation] = useState('');
  const [endDate, setEndDate] = useState<string | null>(null);
  const { mutate: createCommunity, isPending } = useCreateCommunity();

  const canCreate = title.trim().length > 0 && !isPending;

  const handleCreate = () => {
    if (!canCreate) return;
    const look = TYPES.find((t) => t.value === type) ?? TYPES[0];
    createCommunity(
      {
        title: title.trim(),
        description: description.trim(),
        type,
        location,
        end_date: endDate || undefined,
        color: look.color,
        bg_color: look.bg,
      },
      {
        onSuccess: () => { setTitle(''); setDescription(''); setType('Pública'); setLocation(''); setEndDate(null); onClose(); },
        onError: (err: any) => showError('Não foi possível criar a comunidade', err?.message || 'Tente de novo em instantes.'),
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={isPending ? () => {} : onClose} title="Criar comunidade" fill>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 220 }}>
        <View style={s.field}>
          <Text style={s.label}>Nome do grupo</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Ex.: Brasileiros na Austrália" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} maxLength={80} accessibilityLabel="Nome do grupo" style={s.input} />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Tipo de grupo</Text>
          <View style={{ gap: 8 }}>
            {TYPES.map((t) => {
              const on = type === t.value;
              return (
                <Pressable key={t.value} onPress={() => setType(t.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[s.type, on && s.typeOn]}>
                  <View style={[s.typeTile, { backgroundColor: on ? colors.card : colors.surface }]}><t.icon size={22} weight="duotone" color={on ? colors.primary : colors.textSecondary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.typeLabel, on && { color: colors.primary }]}>{t.label}</Text>
                    <Text style={s.typeText}>{t.text}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[s.field, { zIndex: 10 }]}>
          <Text style={s.label}>Localização <Text style={s.optional}>(opcional)</Text></Text>
          <CityAutocomplete value={location} onChangeText={setLocation} placeholder="Ex.: Sydney, Austrália" darkTheme={isDark} />
        </View>

        {type === 'Temporária' ? (
          <View style={s.field}>
            <Text style={s.label}>Data de encerramento</Text>
            <CustomDatePicker value={endDate} onChange={setEndDate} placeholder="DD/MM/AAAA" minimumDate={new Date()} />
          </View>
        ) : null}

        <View style={s.field}>
          <Text style={s.label}>Descrição <Text style={s.optional}>(opcional)</Text></Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Sobre o que é este grupo?" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} multiline maxLength={300} accessibilityLabel="Descrição" style={[s.input, s.textArea]} />
        </View>
      </ScrollView>

      <Pressable onPress={handleCreate} disabled={!canCreate} accessibilityRole="button" style={({ pressed }) => [s.cta, !canCreate && s.ctaOff, pressed && canCreate && { transform: [{ scale: 0.98 }] }]}>
        {isPending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[s.ctaText, !canCreate && { color: colors.textMuted }]}>Criar comunidade</Text>}
      </Pressable>
    </Sheet>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  optional: { fontWeight: '400', color: c.textMuted },
  input: { minHeight: 50, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: c.textPrimary, backgroundColor: c.surface },
  textArea: { minHeight: 90, maxHeight: 150, textAlignVertical: 'top', lineHeight: 22 },
  type: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border },
  typeOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
  typeTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  typeText: { fontSize: 13, color: c.textSecondary, marginTop: 1 },
  cta: { height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaOff: { backgroundColor: c.surface },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
});
