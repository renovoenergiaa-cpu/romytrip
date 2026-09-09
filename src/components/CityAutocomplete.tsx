import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Search, MapPin } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';

interface CityAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  darkTheme?: boolean;
}

interface PhotonFeature {
  properties: {
    name: string;
    state?: string;
    country?: string;
  };
}

export function CityAutocomplete({ value, onChangeText, placeholder = 'Buscar cidade...', darkTheme = false }: CityAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Ref to track timeout for debouncing API calls
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch cities from Photon API
  useEffect(() => {
    const safeValue = value || '';
    
    // Clear previous timeout if user types quickly
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (safeValue.length < 3) {
      setResults([]);
      return;
    }

    // Don't search if the value is likely already selected (we don't want to show dropdown again immediately after selecting)
    // We'll rely on the user typing to trigger searches
    
    debounceTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(safeValue)}&format=json&addressdetails=1&limit=5`, {
          headers: {
            'User-Agent': 'RomyApp/1.0',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
          }
        });
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const text = await response.text();
        // Check if it's actually JSON
        if (text.trim().startsWith('<')) {
          throw new Error('Received HTML instead of JSON');
        }
        
        const data = JSON.parse(text);
        
        if (data && Array.isArray(data)) {
          const cities = data.map((f: any) => {
            const parts = [];
            const city = f.address?.city || f.address?.town || f.address?.village || f.name;
            if (city) parts.push(city);
            if (f.address?.state) parts.push(f.address.state);
            if (f.address?.country) parts.push(f.address.country);
            return parts.join(', ');
          }).filter((c: string) => c.length > 0);
          
          // Remove duplicates
          const uniqueCities = [...new Set(cities)] as string[];
          setResults(uniqueCities);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [value]);

  return (
    <View style={[styles.container, { zIndex: 10 }]}>
      <View style={[
        styles.inputContainer, 
        darkTheme && { backgroundColor: '#2A2A2A' },
        isFocused && styles.inputFocused,
        darkTheme && isFocused && { backgroundColor: '#2A2A2A', borderColor: '#A855F7' }
      ]}>
        <View style={styles.icon}>
          <Search size={20} color={isFocused ? (darkTheme ? '#A855F7' : colors.primary) : (darkTheme ? '#A1A1AA' : colors.textMuted)} />
        </View>
        <TextInput
          style={[styles.input, darkTheme && { color: '#FFF' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={darkTheme ? '#A1A1AA' : colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 250);
          }}
        />
        {loading && <ActivityIndicator size="small" color={darkTheme ? '#A855F7' : colors.primary} style={styles.loader} />}
      </View>

      {isFocused && (value || '').length >= 3 && (
        <View style={[styles.dropdown, darkTheme && { backgroundColor: '#2A2A2A', borderColor: '#3A3A3A' }]}>
          {results.length > 0 ? (
            results.map((city, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.dropdownItem, darkTheme && { borderBottomColor: '#3A3A3A' }]}
                onPress={() => {
                  onChangeText(city);
                  setIsFocused(false);
                }}
              >
                <View style={{ marginRight: spacing.sm }}>
                  <MapPin size={16} color={darkTheme ? '#A1A1AA' : colors.textSecondary} />
                </View>
                <Text style={[styles.dropdownText, darkTheme && { color: '#FFF' }]} numberOfLines={1}>{city}</Text>
              </TouchableOpacity>
            ))
          ) : !loading ? (
            <View style={[styles.dropdownItem, darkTheme && { borderBottomColor: '#3A3A3A' }]}>
              <Text style={[styles.dropdownTextMuted, darkTheme && { color: '#A1A1AA' }]}>Nenhuma cidade encontrada.</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    height: 52,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    ...typography.body,
    color: colors.textPrimary,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  dropdownTextMuted: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
