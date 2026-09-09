import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, ScrollView } from 'react-native';
import { X, MapPin, Calendar, Clock, Beer, TreePalm, Music, Utensils, Trophy, Camera, Activity, Tent, Sun, Coffee } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { useCreateEvent } from '../hooks/useEvents';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
}

export const AVAILABLE_EVENT_ICONS = [
  { id: 'Beer', component: Beer },
  { id: 'TreePalm', component: TreePalm },
  { id: 'Music', component: Music },
  { id: 'Utensils', component: Utensils },
  { id: 'Trophy', component: Trophy },
  { id: 'Camera', component: Camera },
  { id: 'Activity', component: Activity },
  { id: 'Tent', component: Tent },
  { id: 'Sun', component: Sun },
  { id: 'Coffee', component: Coffee }
];

export default function CreateEventModal({ visible, onClose, latitude, longitude, locationName }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Beer');
  const [isPublic, setIsPublic] = useState(true);
  
  // For time input we use HH:MM format
  const [startTimeInput, setStartTimeInput] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  });
  const [durationHours, setDurationHours] = useState('2');

  const { mutate: createEvent, isPending } = useCreateEvent();

  const handleCreate = () => {
    if (!title || !latitude || !longitude) return;

    const start = new Date();
    const [hoursStr, minutesStr] = startTimeInput.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr || '0', 10);
    
    if (!isNaN(hours)) {
      start.setHours(hours, minutes, 0, 0);
      // Se a hora digitada for menor que a atual, assume que é para amanhã
      if (start < new Date()) {
        start.setDate(start.getDate() + 1);
      }
    } else {
      start.setHours(start.getHours() + 1);
    }
    
    const end = new Date(start);
    end.setHours(end.getHours() + parseInt(durationHours || '1', 10));

    createEvent({
      title,
      description,
      latitude,
      longitude,
      location_name: locationName || 'Local Selecionado',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      icon,
      is_public: isPublic
    }, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
        onClose();
      }
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Criar Evento Local</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.lg }}
          >
            <View style={styles.locationBanner}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>{locationName || 'Local marcado no mapa'}</Text>
            </View>

          <Text style={styles.label}>Ícone do Evento</Text>
          <View style={styles.iconContainer}>
            {AVAILABLE_EVENT_ICONS.map((i) => {
              const IconComp = i.component;
              const isActive = icon === i.id;
              return (
                <TouchableOpacity 
                  key={i.id} 
                  style={[styles.iconButton, isActive && styles.iconButtonActive]}
                  onPress={() => setIcon(i.id)}
                >
                  <IconComp size={24} color={isActive ? colors.primary : colors.textPrimary} />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>O que vamos fazer?</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Assistir o pôr do sol"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Detalhes e o que levar (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ex: Cada um leva sua bebida..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={styles.label}>Horário</Text>
              <View style={styles.inputIconRow}>
                <Clock size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.inputSmall}
                  placeholder="00:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                  value={startTimeInput}
                  onChangeText={(text) => {
                    // Auto-format HH:MM
                    let cleaned = text.replace(/[^0-9]/g, '');
                    if (cleaned.length >= 3) {
                      cleaned = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
                    }
                    setStartTimeInput(cleaned);
                  }}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Duração (horas)</Text>
              <View style={styles.inputIconRow}>
                <Calendar size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="numeric"
                  value={durationHours}
                  onChangeText={setDurationHours}
                />
              </View>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelDark}>Evento Público</Text>
              <Text style={styles.hint}>Eventos públicos aparecem no mapa para qualquer um pedir para entrar.</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, (!title || isPending) && { opacity: 0.7 }]} 
            onPress={handleCreate}
            disabled={!title || isPending}
          >
              {isPending ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.submitText}>Criar Evento</Text>
              )}
            </TouchableOpacity>
          </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  locationText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
    flex: 1,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelDark: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  iconText: {
    fontSize: 24,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
  },
  inputSmall: {
    flex: 1,
    padding: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
});
