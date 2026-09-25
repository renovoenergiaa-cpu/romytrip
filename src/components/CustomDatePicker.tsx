import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors, spacing, typography, useTheme } from '../theme';

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDateToBr(date?: Date | null): string {
  if (!date || isNaN(date.getTime())) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  minimumDate,
  maximumDate,
}: CustomDatePickerProps) {
  const { colors: themeColors } = useTheme();

  const [textValue, setTextValue] = useState<string>(() => {
    if (!value) return '';
    const d = new Date(value);
    return !isNaN(d.getTime()) ? formatDateToBr(d) : '';
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [webCalendarOpen, setWebCalendarOpen] = useState(false);
  const [nativePickerOpen, setNativePickerOpen] = useState(false);

  // Sincroniza se o valor externo mudar
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setTextValue(formatDateToBr(d));
        setErrorMsg(null);
      }
    } else {
      setTextValue('');
    }
  }, [value]);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return !isNaN(d.getTime()) ? d : null;
  }, [value]);

  const initialViewDate = selectedDate || maximumDate || minimumDate || new Date();
  const [viewYear, setViewYear] = useState(() => initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => initialViewDate.getMonth());

  // Atualiza visão do calendário quando abrir
  const handleOpenCalendar = () => {
    if (Platform.OS === 'web') {
      const base = selectedDate || maximumDate || minimumDate || new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setWebCalendarOpen(true);
    } else {
      setNativePickerOpen(true);
    }
  };

  // Digitação direta no formato DD/MM/AAAA
  const handleTextChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
    setTextValue(formatted);

    if (digits.length === 8) {
      const day = parseInt(digits.slice(0, 2), 10);
      const month = parseInt(digits.slice(2, 4), 10);
      const year = parseInt(digits.slice(4, 8), 10);

      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        setErrorMsg('Data inválida');
        return;
      }

      const d = new Date(year, month - 1, day, 12, 0, 0);
      if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
        setErrorMsg('Dia inexistente no mês informado');
        return;
      }

      if (maximumDate && d > maximumDate) {
        setErrorMsg('Data posterior ao limite permitido');
        return;
      }
      if (minimumDate && d < minimumDate) {
        setErrorMsg('Data anterior ao limite permitido');
        return;
      }

      setErrorMsg(null);
      onChange(d.toISOString());
    } else {
      setErrorMsg(null);
    }
  };

  // Navegação do calendário customizado Web
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const chosen = new Date(viewYear, viewMonth, dayNum, 12, 0, 0);
    if (minimumDate && chosen < minimumDate) return;
    if (maximumDate && chosen > maximumDate) return;

    setTextValue(formatDateToBr(chosen));
    setErrorMsg(null);
    onChange(chosen.toISOString());
    setWebCalendarOpen(false);
  };

  // Geração da grade de dias
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek]);

  // Handler nativo mobile
  const handleNativeDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setNativePickerOpen(false);
    }
    if (event.type === 'set' && date) {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      setTextValue(formatDateToBr(d));
      setErrorMsg(null);
      onChange(d.toISOString());
    } else if (event.type === 'dismiss') {
      setNativePickerOpen(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Campo de Entrada */}
      <View
        style={[
          styles.dateInputContainer,
          {
            backgroundColor: themeColors.inputBackground,
            borderColor: errorMsg
              ? '#EF4444'
              : isFocused
              ? themeColors.primary
              : themeColors.border || 'transparent',
            borderWidth: 1.5,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: themeColors.textPrimary,
              outlineStyle: 'none' as any,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.textSecondary}
          value={textValue}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="numeric"
          maxLength={10}
        />

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.7}
          onPress={handleOpenCalendar}
          accessibilityLabel="Abrir calendário visual"
        >
          <Calendar size={18} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* Calendário Modal 100% Customizado para Web (Sem mm/dd/yyyy de navegador) */}
      {Platform.OS === 'web' && (
        <Modal
          visible={webCalendarOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setWebCalendarOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setWebCalendarOpen(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.calendarCard,
                {
                  backgroundColor: themeColors.card || '#181820',
                  borderColor: themeColors.border || '#333',
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho do Calendário */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={prevMonth}
                  style={styles.navArrow}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={20} color={themeColors.textPrimary} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                  {PT_MONTHS[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity
                  onPress={nextMonth}
                  style={styles.navArrow}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={20} color={themeColors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setWebCalendarOpen(false)}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Dias da Semana */}
              <View style={styles.weekdayRow}>
                {PT_WEEKDAYS.map((wd, i) => (
                  <Text key={i} style={styles.weekdayText}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Grade de Dias */}
              <View style={styles.daysGrid}>
                {calendarDays.map((dayNum, idx) => {
                  if (!dayNum) {
                    return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                  }

                  const cellDate = new Date(viewYear, viewMonth, dayNum, 12, 0, 0);
                  const isPastMin = minimumDate && cellDate < minimumDate;
                  const isFutureMax = maximumDate && cellDate > maximumDate;
                  const isDisabled = Boolean(isPastMin || isFutureMax);

                  const isSelected =
                    selectedDate &&
                    selectedDate.getFullYear() === viewYear &&
                    selectedDate.getMonth() === viewMonth &&
                    selectedDate.getDate() === dayNum;

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: colors.primary },
                        isDisabled && styles.dayCellDisabled,
                      ]}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                      onPress={() => handleSelectDay(dayNum)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : isDisabled
                              ? '#555566'
                              : themeColors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Rodapé informativo */}
              <View style={styles.calendarFooter}>
                <Text style={styles.footerHint}>
                  Toque em um dia para selecionar no formato DD/MM/AAAA
                </Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Picker Nativo Mobile */}
      {Platform.OS !== 'web' && nativePickerOpen && (
        <DateTimePicker
          value={initialViewDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleNativeDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === 'ios' && nativePickerOpen && (
        <TouchableOpacity
          style={styles.iosDoneButton}
          onPress={() => setNativePickerOpen(false)}
        >
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Concluído</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 52,
    position: 'relative',
  },
  iconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    ...typography.body,
    fontSize: 14,
  },
  errorText: {
    ...typography.caption,
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  navArrow: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
  },
  weekdayText: {
    ...typography.caption,
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 2,
  },
  dayCell: {
    width: 38,
    height: 38,
    marginVertical: 2,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 14,
  },
  calendarFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  footerHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  iosDoneButton: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});
