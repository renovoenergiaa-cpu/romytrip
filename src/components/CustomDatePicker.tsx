import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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

export function CustomDatePicker({ value, onChange, placeholder = "Selecionar data", minimumDate, maximumDate }: CustomDatePickerProps) {
  const { isDark, colors: themeColors } = useTheme();
  
  const [show, setShow] = useState(false);
  
  const selectedDate = value ? new Date(value) : null;
  const pickerDate = selectedDate || minimumDate || new Date();

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    
    if (event.type === 'set' && date) {
      // Create a date at noon to avoid timezone issues
      const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      onChange(newDate.toISOString());
    } else if (event.type === 'dismiss') {
      setShow(false);
    }
  };

  const formattedDate = selectedDate 
    ? selectedDate.toLocaleDateString('pt-BR') 
    : placeholder;

  return (
    <View>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => setShow(true)}
        style={[
          styles.dateInputContainer, 
          { backgroundColor: themeColors.inputBackground },
          { borderColor: 'transparent', borderWidth: 1 }
        ]}
      >
        <Calendar size={20} color={themeColors.primary} style={styles.iconContainer} />
        <Text style={[
          styles.input, 
          { 
            color: selectedDate ? themeColors.textPrimary : themeColors.textSecondary,
            paddingVertical: 14
          }
        ]}>
          {formattedDate}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
      
      {Platform.OS === 'ios' && show && (
         <TouchableOpacity 
            style={styles.iosDoneButton}
            onPress={() => setShow(false)}
         >
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Concluído</Text>
         </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    ...typography.body,
  },
  iosDoneButton: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  }
});
