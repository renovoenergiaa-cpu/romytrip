import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MapPin, Calendar, Compass } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { AVAILABLE_EVENT_ICONS } from './CreateEventModal';

export interface RomyMapProps {
  mapRegion: any;
  onLongPress: (e: any) => void;
  onRegionChangeComplete: (region: any) => void;
  localEvents?: any[];
  onSelectEvent: (event: any) => void;
  style?: any;
  children?: React.ReactNode;
}

const RomyMap = forwardRef<any, RomyMapProps>(({
  mapRegion,
  onLongPress,
  onRegionChangeComplete,
  localEvents = [],
  onSelectEvent,
  style,
  children
}, ref) => {
  const [currentRegion, setCurrentRegion] = useState(mapRegion);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      setCurrentRegion(region);
      onRegionChangeComplete?.(region);
    }
  }));

  const lat = currentRegion?.latitude || -23.5505;
  const lon = currentRegion?.longitude || -46.6333;
  const bboxDelta = 0.05;
  const bbox = `${lon - bboxDelta}%2C${lat - bboxDelta}%2C${lon + bboxDelta}%2C${lat + bboxDelta}`;
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <View style={[styles.container, style]}>
      {/* Map Embed for Web */}
      <View style={styles.mapFrameWrapper}>
        <iframe
          title="Romy Web Map"
          src={iframeSrc}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)',
          }}
        />
      </View>

      {/* Local Events Bar Overlay */}
      <View style={styles.eventsOverlay}>
        <View style={styles.eventsHeaderRow}>
          <Compass size={18} color={colors.primary} />
          <Text style={styles.eventsHeading}>Eventos Rolando na Região ({localEvents.length})</Text>
        </View>

        {localEvents.length === 0 ? (
          <View style={styles.noEventsBadge}>
            <Text style={styles.noEventsText}>Nenhum evento criado por perto ainda.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsList}>
            {localEvents.map((evt) => {
              const iconObj = AVAILABLE_EVENT_ICONS.find((i) => i.id === evt.icon);
              const IconComp = iconObj?.component;

              return (
                <TouchableOpacity
                  key={evt.id}
                  style={styles.eventChip}
                  activeOpacity={0.8}
                  onPress={() => onSelectEvent(evt)}
                >
                  <View style={styles.iconCircle}>
                    {IconComp ? (
                      <IconComp size={16} color={colors.primary} />
                    ) : (
                      <Text style={{ fontSize: 14 }}>{evt.icon || '📍'}</Text>
                    )}
                  </View>
                  <View style={styles.eventTextGroup}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{evt.title || 'Evento'}</Text>
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      {evt.location_name || 'Ver detalhes'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {children}
    </View>
  );
});

RomyMap.displayName = 'RomyMapWeb';

export default RomyMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0a0a0c',
  },
  mapFrameWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  eventsOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(18, 18, 22, 0.92)',
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  eventsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  eventsHeading: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  eventsList: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTextGroup: {
    maxWidth: 160,
  },
  eventTitle: {
    ...typography.caption,
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  eventLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  noEventsBadge: {
    paddingVertical: 6,
  },
  noEventsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
});
