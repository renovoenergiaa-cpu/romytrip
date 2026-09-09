import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { X, Globe, Lock, Clock, Users } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { useCreateCommunity } from '../hooks/useCommunities';
import { CityAutocomplete } from './CityAutocomplete';
import { CustomDatePicker } from './CustomDatePicker';

export default function CreateCommunityModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Pública');
  const [location, setLocation] = useState('');
  const [endDate, setEndDate] = useState<string | null>(null);
  
  const { mutate: createCommunity, isPending } = useCreateCommunity();

  const handleCreate = () => {
    if (!title.trim()) return;

    let color = '#10B981';
    let bgColor = '#D1FAE5';
    
    if (type === 'Privada') { color = '#F59E0B'; bgColor = '#FEF3C7'; }
    if (type === 'Internacional') { color = '#3B82F6'; bgColor = '#DBEAFE'; }
    if (type === 'Temporária') { color = '#A855F7'; bgColor = '#F3E8FF'; }

    createCommunity({
      title,
      description,
      type,
      location,
      end_date: endDate || undefined,
      color,
      bg_color: bgColor,
    }, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
        setType('Pública');
        setLocation('');
        setEndDate(null);
        onClose();
      },
      onError: (err: any) => {
        Alert.alert('Erro ao criar comunidade', err.message || 'Verifique se você executou o código SQL no painel do Supabase.');
      }
    });
  };

  const types = [
    { label: 'Pública', icon: <Users size={16} color={type === 'Pública' ? '#FFF' : '#10B981'} />, color: '#10B981' },
    { label: 'Privada', icon: <Lock size={16} color={type === 'Privada' ? '#FFF' : '#F59E0B'} />, color: '#F59E0B' },
    { label: 'Internacional', icon: <Globe size={16} color={type === 'Internacional' ? '#FFF' : '#3B82F6'} />, color: '#3B82F6' },
    { label: 'Temporária', icon: <Clock size={16} color={type === 'Temporária' ? '#FFF' : '#A855F7'} />, color: '#A855F7' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Criar Comunidade</Text>
            <TouchableOpacity onPress={onClose} disabled={isPending} style={styles.closeBtn}>
              <X size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nome do Grupo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Brasileiros na Austrália"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Tipo de Grupo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {types.map(t => (
                <TouchableOpacity 
                  key={t.label}
                  style={[styles.typeBtn, type === t.label && { backgroundColor: t.color, borderColor: t.color }]}
                  onPress={() => setType(t.label)}
                >
                  {t.icon}
                  <Text style={[styles.typeText, type === t.label && { color: '#FFF' }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Localização (Opcional)</Text>
            <View style={{ zIndex: 10 }}>
              <CityAutocomplete
                value={location}
                onChangeText={setLocation}
                placeholder="Ex: Sydney, Austrália"
                darkTheme={true}
              />
            </View>

            {type === 'Temporária' && (
              <>
                <Text style={styles.label}>Data de Encerramento</Text>
                <CustomDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="DD/MM/AAAA"
                  minimumDate={new Date()}
                />
              </>
            )}

            <Text style={styles.label}>Descrição (Opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Sobre o que é este grupo?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, (!title.trim() || isPending) && { opacity: 0.6 }]} 
              onPress={handleCreate}
              disabled={!title.trim() || isPending}
            >
              {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Criar Comunidade</Text>}
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: '#FFF',
    fontWeight: '800',
  },
  closeBtn: {
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 20,
  },
  label: {
    ...typography.caption,
    fontWeight: 'bold',
    color: '#A1A1AA',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    color: '#FFF',
    minHeight: 50,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    gap: 6,
  },
  typeText: {
    ...typography.body,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  submitText: {
    ...typography.h3,
    color: '#FFF',
  },
});
