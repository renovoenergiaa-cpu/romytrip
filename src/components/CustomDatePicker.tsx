import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { colors, spacing, typography, useTheme } from '../theme';

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

function toYyyyMmDd(date?: Date | null): string {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
  const [nativePickerOpen, setNativePickerOpen] = useState(false);
  const webDateInputRef = useRef<any>(null);

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

  const pickerDate = selectedDate || maximumDate || minimumDate || new Date();

  // Tratamento da digitação com máscara DD/MM/AAAA no Web
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
        setErrorMsg('Data inexistente no calendário');
        return;
      }

      if (maximumDate && d > maximumDate) {
        setErrorMsg('Data posterior ao limite permitido (exige maior de 18 anos)');
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

  // Handler do DateTimePicker Nativo (Android / iOS)
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

  // Abrir seletor de calendário
  const handleOpenPicker = () => {
    if (Platform.OS === 'web') {
      if (webDateInputRef.current) {
        try {
          if (typeof webDateInputRef.current.showPicker === 'function') {
            webDateInputRef.current.showPicker();
          } else {
            webDateInputRef.current.focus();
            webDateInputRef.current.click();
          }
        } catch {
          webDateInputRef.current.click();
        }
      }
    } else {
      setNativePickerOpen(true);
    }
  };

  return (
    <View style={styles.wrapper}>
      {Platform.OS === 'web' ? (
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
            onPress={handleOpenPicker}
            accessibilityLabel="Abrir calendário"
          >
            <Calendar size={20} color={themeColors.primary} />
          </TouchableOpacity>

          {/* Input de data nativo HTML5 invisível no Web com min/max travados */}
          <input
            ref={webDateInputRef}
            type="date"
            tabIndex={-1}
            min={minimumDate ? toYyyyMmDd(minimumDate) : '1900-01-01'}
            max={maximumDate ? toYyyyMmDd(maximumDate) : undefined}
            value={selectedDate ? toYyyyMmDd(selectedDate) : ''}
            onChange={(e: any) => {
              const val = e.target.value; // "YYYY-MM-DD"
              if (val && val.length === 10) {
                const [y, m, d] = val.split('-').map(Number);
                const chosen = new Date(y, m - 1, d, 12, 0, 0);
                if (maximumDate && chosen > maximumDate) {
                  setErrorMsg('Idade mínima de 18 anos exigida');
                  return;
                }
                if (minimumDate && chosen < minimumDate) {
                  setErrorMsg('Data anterior ao limite permitido');
                  return;
                }
                setErrorMsg(null);
                setTextValue(formatDateToBr(chosen));
                onChange(chosen.toISOString());
              }
            }}
            style={{
              position: 'absolute',
              right: 12,
              bottom: 8,
              opacity: 0,
              width: 32,
              height: 32,
              cursor: 'pointer',
            }}
          />
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenPicker}
          style={[
            styles.dateInputContainer,
            {
              backgroundColor: themeColors.inputBackground,
              borderColor: errorMsg ? '#EF4444' : 'transparent',
              borderWidth: 1,
            },
          ]}
        >
          <Calendar size={20} color={themeColors.primary} style={styles.iconContainer} />
          <Text
            style={[
              styles.input,
              {
                color: selectedDate ? themeColors.textPrimary : themeColors.textSecondary,
                paddingVertical: 14,
              },
            ]}
          >
            {textValue || placeholder}
          </Text>
        </TouchableOpacity>
      )}

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : null}

      {/* Picker Nativo Mobile */}
      {Platform.OS !== 'web' && nativePickerOpen && (
        <DateTimePicker
          value={pickerDate}
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
    paddingHorizontal: spacing.md,
    height: 52,
    position: 'relative',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  iconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    ...typography.body,
    fontSize: 15,
  },
  errorText: {
    ...typography.caption,
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  iosDoneButton: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});
