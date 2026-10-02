import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Sheet } from './Sheet';
import { useTheme, type ThemeColors } from '../theme';
import { useCreateEvent } from '../hooks/useEvents';
import { showError } from '../lib/dialogs';
import { AVAILABLE_EVENT_ICONS } from '../features/events/eventIcons';
import { DURATIONS, defaultStart, formatClockInput, parseStart } from '../features/events/time';
import { Clock, MapPin } from '../features/onboarding/icons';

// Compatível com quem ainda importa a lista daqui
export { AVAILABLE_EVENT_ICONS };

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
}

export default function CreateEventModal({ visible, onClose, latitude, longitude, locationName }: CreateEventModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Beer');
  const [isPublic, setIsPublic] = useState(true);
  const [startInput, setStartInput] = useState(defaultStart);
  const [duration, setDuration] = useState(2);
  const { mutate: createEvent, isPending } = useCreateEvent();

  const start = parseStart(startInput);
  const startsTomorrow = !!start && start.getDate() !== new Date().getDate();
  const canCreate = title.trim().length > 0 && !!start && !!latitude && !!longitude && !isPending;

  const handleCreate = () => {
    if (!canCreate || !start || !latitude || !longitude) return;
    const end = new Date(start.getTime() + duration * 3_600_000);
    createEvent(
      {
        title: title.trim(),
        description: description.trim(),
        latitude,
        longitude,
        location_name: locationName || 'Local marcado no mapa',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        icon,
        is_public: isPublic,
      },
      {
        onSuccess: () => { setTitle(''); setDescription(''); setStartInput(defaultStart()); onClose(); },
        onError: () => showError('Não foi possível criar o evento', 'Confira sua conexão e tente de novo.'),
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Criar evento" fill>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 12 }}>
        <View style={s.place}>
          <MapPin size={20} weight="fill" color={colors.primary} />
          <Text style={s.placeText} numberOfLines={1}>{locationName || 'Local marcado no mapa'}</Text>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Tipo de evento</Text>
          <View style={s.icons}>
            {AVAILABLE_EVENT_ICONS.map((i) => {
              const on = icon === i.id;
              return (
                <Pressable key={i.id} onPress={() => setIcon(i.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={i.label} style={[s.iconCell, on && s.iconCellOn]}>
                  <i.component size={26} weight={on ? 'fill' : 'duotone'} color={on ? colors.primary : colors.textSecondary} />
                  <Text style={[s.iconLabel, on && { color: colors.primary }]} numberOfLines={1}>{i.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>O que vamos fazer?</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Ex.: assistir ao pôr do sol" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} maxLength={80} accessibilityLabel="O que vamos fazer?" style={s.input} />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Detalhes e o que levar <Text style={s.optional}>(opcional)</Text></Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Ex.: cada pessoa leva sua bebida" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} multiline maxLength={300} accessibilityLabel="Detalhes do evento" style={[s.input, s.textArea]} />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Horário de início</Text>
          <View style={[s.inputRow, !start && startInput.length > 0 && { borderColor: colors.error }]}>
            <Clock size={20} weight="duotone" color={colors.textSecondary} />
            <TextInput
              value={startInput}
              onChangeText={(text) => setStartInput(formatClockInput(text))}
              placeholder="18:00"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel="Horário de início"
              style={s.inputBare}
            />
          </View>
          <Text style={[s.hint, !start && startInput.length > 0 && { color: colors.error }]}>
            {start ? `Começa ${startsTomorrow ? 'amanhã' : 'hoje'} às ${startInput}` : 'Use o formato 18:30 (de 00:00 a 23:59)'}
          </Text>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Duração</Text>
          <View style={s.chips}>
            {DURATIONS.map((h) => (
              <Pressable key={h} onPress={() => setDuration(h)} accessibilityRole="radio" accessibilityState={{ checked: duration === h }} style={[s.chip, duration === h && s.chipOn]}>
                <Text style={[s.chipText, duration === h && s.chipTextOn]}>{`${h} h`}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchTitle}>Evento público</Text>
            <Text style={s.hint}>Aparece no mapa para qualquer pessoa pedir para entrar.</Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" accessibilityLabel="Evento público" />
        </View>
      </ScrollView>

      <Pressable onPress={handleCreate} disabled={!canCreate} accessibilityRole="button" style={({ pressed }) => [s.cta, !canCreate && s.ctaOff, pressed && canCreate && { transform: [{ scale: 0.98 }] }]}>
        {isPending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[s.ctaText, !canCreate && { color: colors.textMuted }]}>Criar evento</Text>}
      </Pressable>
    </Sheet>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: c.primarySoft },
  placeText: { flex: 1, fontSize: 15, fontWeight: '700', color: c.primary },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  optional: { fontWeight: '400', color: c.textMuted },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: { width: '18.4%', minWidth: 60, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1.5, borderColor: 'transparent' },
  iconCellOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
  iconLabel: { fontSize: 11, fontWeight: '600', color: c.textSecondary },
  input: { minHeight: 50, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: c.textPrimary, backgroundColor: c.surface },
  textArea: { minHeight: 84, maxHeight: 140, textAlignVertical: 'top', lineHeight: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1.5, borderColor: 'transparent' },
  inputBare: { flex: 1, fontSize: 18, fontWeight: '700', color: c.textPrimary, paddingVertical: 0, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: c.primary },
  chipText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  chipTextOn: { color: c.onPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  switchTitle: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
  cta: { height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaOff: { backgroundColor: c.surface },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
});
