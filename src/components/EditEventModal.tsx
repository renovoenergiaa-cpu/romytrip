import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { X, MapPin, Calendar, Clock } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { useUpdateEvent } from '../hooks/useEvents';

interface EditEventModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
}

const AVAILABLE_ICONS = ['🍻', '🏖️', '🎵', '🍽️', '⚽', '📸', '🧘', '🏕️', '🏄‍♂️', '☕'];

export default function EditEventModal({ visible, event, onClose }: EditEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🍻');
  const [isPublic, setIsPublic] = useState(true);
  
  // For simplicity, editing just duration/start again as offset
  const [hoursFromNow, setHoursFromNow] = useState('0');
  const [durationHours, setDurationHours] = useState('2');

  const { mutate: updateEvent, isPending } = useUpdateEvent();

  useEffect(() => {
    if (event && visible) {
      setTitle(event.title);
      setDescription(event.description || '');
      setIcon(event.icon);
      setIsPublic(event.is_public);
      setHoursFromNow('0'); // Default to now when editing unless they change it
      setDurationHours('2'); // Default
    }
  }, [event, visible]);

  const handleUpdate = () => {
    if (!title || !event) return;

    const start = new Date();
    start.setHours(start.getHours() + parseInt(hoursFromNow || '0', 10));
    
    const end = new Date(start);
    end.setHours(end.getHours() + parseInt(durationHours || '1', 10));

    updateEvent({
      eventId: event.id,
      updates: {
        title,
        description,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        icon,
        is_public: isPublic
      }
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  if (!event) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Evento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.locationBanner}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{event.location_name}</Text>
          </View>

          <Text style={styles.label}>Ícone do Evento</Text>
          <View style={styles.iconContainer}>
            {AVAILABLE_ICONS.map((i) => (
              <TouchableOpacity 
                key={i} 
                style={[styles.iconButton, icon === i && styles.iconButtonActive]}
                onPress={() => setIcon(i)}
              >
                <Text style={styles.iconText}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>O que vamos fazer?</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Assistir o pôr do sol"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Detalhes e o que levar</Text>
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
              <Text style={styles.label}>Novo Início (horas a partir de agora)</Text>
              <View style={styles.inputIconRow}>
                <Clock size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="numeric"
                  value={hoursFromNow}
                  onChangeText={setHoursFromNow}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nova Duração (horas)</Text>
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
            onPress={handleUpdate}
            disabled={!title || isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitText}>Salvar Alterações</Text>
            )}
          </TouchableOpacity>

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
