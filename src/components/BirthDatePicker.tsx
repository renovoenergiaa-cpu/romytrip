import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, TouchableOpacity, Modal, FlatList } from 'react-native';
import { colors, spacing, typography, useTheme } from '../theme';
import { ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface BirthDatePickerProps {
  value?: string | null;
  onChange: (dateIso: string) => void;
  onErrorChange?: (hasError: boolean) => void;
}

const MONTHS = [
  { value: '01', label: '01 - Jan' },
  { value: '02', label: '02 - Fev' },
  { value: '03', label: '03 - Mar' },
  { value: '04', label: '04 - Abr' },
  { value: '05', label: '05 - Mai' },
  { value: '06', label: '06 - Jun' },
  { value: '07', label: '07 - Jul' },
  { value: '08', label: '08 - Ago' },
  { value: '09', label: '09 - Set' },
  { value: '10', label: '10 - Out' },
  { value: '11', label: '11 - Nov' },
  { value: '12', label: '12 - Dez' },
];

export function BirthDatePicker({ value, onChange, onErrorChange }: BirthDatePickerProps) {
  const { colors: themeColors } = useTheme();

  // Divide o valor inicial se existir
  const [day, setDay] = useState(() => {
    if (!value) return '';
    try {
      const d = new Date(value);
      return !isNaN(d.getTime()) ? String(d.getDate()).padStart(2, '0') : '';
    } catch {
      return '';
    }
  });

  const [month, setMonth] = useState(() => {
    if (!value) return '';
    try {
      const d = new Date(value);
      return !isNaN(d.getTime()) ? String(d.getMonth() + 1).padStart(2, '0') : '';
    } catch {
      return '';
    }
  });

  const [year, setYear] = useState(() => {
    if (!value) return '';
    try {
      const d = new Date(value);
      return !isNaN(d.getTime()) ? String(d.getFullYear()) : '';
    } catch {
      return '';
    }
  });

  const [mobileMonthModal, setMobileMonthModal] = useState(false);
  const [status, setStatus] = useState<{ message: string; isError: boolean; age?: number } | null>(null);

  const dayInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);

  // Sincroniza se o valor externo mudar
  useEffect(() => {
    if (value) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          setDay(String(d.getDate()).padStart(2, '0'));
          setMonth(String(d.getMonth() + 1).padStart(2, '0'));
          setYear(String(d.getFullYear()));
        }
      } catch {}
    }
  }, [value]);

  // Validação em tempo real
  useEffect(() => {
    if (!day || !month || !year) {
      setStatus(null);
      onErrorChange?.(false);
      return;
    }

    if (year.length < 4) {
      setStatus(null);
      onErrorChange?.(false);
      return;
    }

    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    const yNum = parseInt(year, 10);

    if (isNaN(dNum) || isNaN(mNum) || isNaN(yNum)) {
      setStatus({ message: 'Data inválida', isError: true });
      onErrorChange?.(true);
      return;
    }

    if (yNum < 1920 || yNum > new Date().getFullYear()) {
      setStatus({ message: 'Ano inválido', isError: true });
      onErrorChange?.(true);
      return;
    }

    // Valida dia no calendário do mês correspondente
    const dateObj = new Date(yNum, mNum - 1, dNum, 12, 0, 0);
    if (dateObj.getFullYear() !== yNum || dateObj.getMonth() !== mNum - 1 || dateObj.getDate() !== dNum) {
      setStatus({ message: `Dia inválido para este mês (${dNum}/${mNum})`, isError: true });
      onErrorChange?.(true);
      return;
    }

    // Cálculo exato de idade
    const today = new Date();
    let calculatedAge = today.getFullYear() - yNum;
    const monthDiff = today.getMonth() - (mNum - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dNum)) {
      calculatedAge--;
    }

    if (calculatedAge < 18) {
      setStatus({
        message: `🔞 Cadastro exclusivo para maiores de 18 anos (idade calculada: ${calculatedAge} anos).`,
        isError: true,
        age: calculatedAge,
      });
      onErrorChange?.(true);
      return;
    }

    // Sucesso - maior de 18 anos
    setStatus({
      message: `✓ ${calculatedAge} anos completos`,
      isError: false,
      age: calculatedAge,
    });
    onErrorChange?.(false);
    onChange(dateObj.toISOString());
  }, [day, month, year]);

  const handleDayChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 2);
    setDay(cleaned);
    if (cleaned.length === 2) {
      const num = parseInt(cleaned, 10);
      if (num > 31) setDay('31');
      if (yearInputRef.current && (!year || year.length < 4)) {
        yearInputRef.current.focus();
      }
    }
  };

  const handleYearChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    setYear(cleaned);
  };

  const selectedMonthLabel = MONTHS.find((m) => m.value === month)?.label || 'Mês';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Campo Dia */}
        <View style={styles.colDay}>
          <Text style={styles.subLabel}>Dia</Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: themeColors.inputBackground,
                borderColor: status?.isError ? '#EF4444' : themeColors.border || '#333',
              },
            ]}
          >
            <TextInput
              ref={dayInputRef}
              style={[
                styles.textInput,
                {
                  color: themeColors.textPrimary,
                  outlineStyle: 'none' as any,
                },
              ]}
              placeholder="Ex: 15"
              placeholderTextColor={themeColors.textSecondary}
              value={day}
              onChangeText={handleDayChange}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        </View>

        {/* Campo Mês */}
        <View style={styles.colMonth}>
          <Text style={styles.subLabel}>Mês</Text>
          {Platform.OS === 'web' ? (
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: themeColors.inputBackground,
                  borderColor: status?.isError ? '#EF4444' : themeColors.border || '#333',
                  paddingHorizontal: 0,
                },
              ]}
            >
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'transparent',
                  color: month ? themeColors.textPrimary : themeColors.textSecondary,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '0 8px',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
              >
                <option value="" disabled style={{ color: '#888' }}>
                  Mês
                </option>
                {MONTHS.map((m) => (
                  <option
                    key={m.value}
                    value={m.value}
                    style={{
                      backgroundColor: '#1E1E24',
                      color: '#FFF',
                      padding: '8px',
                    }}
                  >
                    {m.label}
                  </option>
                ))}
              </select>
              <View style={styles.selectIconWrap} pointerEvents="none">
                <ChevronDown size={16} color={themeColors.textSecondary} />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMobileMonthModal(true)}
              style={[
                styles.inputBox,
                {
                  backgroundColor: themeColors.inputBackground,
                  borderColor: status?.isError ? '#EF4444' : themeColors.border || '#333',
                  justifyContent: 'space-between',
                },
              ]}
            >
              <Text
                style={[
                  styles.monthText,
                  { color: month ? themeColors.textPrimary : themeColors.textSecondary },
                ]}
              >
                {selectedMonthLabel}
              </Text>
              <ChevronDown size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Campo Ano */}
        <View style={styles.colYear}>
          <Text style={styles.subLabel}>Ano</Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: themeColors.inputBackground,
                borderColor: status?.isError ? '#EF4444' : themeColors.border || '#333',
              },
            ]}
          >
            <TextInput
              ref={yearInputRef}
              style={[
                styles.textInput,
                {
                  color: themeColors.textPrimary,
                  outlineStyle: 'none' as any,
                },
              ]}
              placeholder="Ex: 1998"
              placeholderTextColor={themeColors.textSecondary}
              value={year}
              onChangeText={handleYearChange}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>
      </View>

      {/* Feedback de Idade / Erro */}
      {status ? (
        <View style={styles.feedbackRow}>
          {status.isError ? (
            <AlertCircle size={15} color="#EF4444" style={styles.feedbackIcon} />
          ) : (
            <CheckCircle2 size={15} color="#10B981" style={styles.feedbackIcon} />
          )}
          <Text
            style={[
              styles.feedbackText,
              { color: status.isError ? '#EF4444' : '#10B981' },
            ]}
          >
            {status.message}
          </Text>
        </View>
      ) : null}

      {/* Modal de Mês para Mobile */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={mobileMonthModal}
          transparent
          animationType="fade"
          onRequestClose={() => setMobileMonthModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMobileMonthModal(false)}
          >
            <View style={[styles.modalCard, { backgroundColor: themeColors.card || '#1A1A22' }]}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                Selecione o Mês
              </Text>
              <FlatList
                data={MONTHS}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.monthOption,
                      month === item.value && { backgroundColor: colors.primary + '22' },
                    ]}
                    onPress={() => {
                      setMonth(item.value);
                      setMobileMonthModal(false);
                      if (yearInputRef.current && (!year || year.length < 4)) {
                        yearInputRef.current.focus();
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        {
                          color: month === item.value ? colors.primary : themeColors.textPrimary,
                          fontWeight: month === item.value ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  colDay: {
    flex: 2.2,
  },
  colMonth: {
    flex: 3.2,
  },
  colYear: {
    flex: 3,
  },
  subLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginLeft: 2,
  },
  inputBox: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectIconWrap: {
    position: 'absolute',
    right: 8,
    pointerEvents: 'none',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  feedbackIcon: {
    marginRight: 6,
  },
  feedbackText: {
    ...typography.caption,
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
    borderRadius: 18,
    padding: 18,
    elevation: 8,
  },
  modalTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  monthOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  monthOptionText: {
    fontSize: 15,
  },
});
