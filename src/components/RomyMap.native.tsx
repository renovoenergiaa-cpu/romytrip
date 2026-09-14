import React, { forwardRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../theme';
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

const EventMarker = ({ event, onPress }: { event: any; onPress: () => void }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const iconObj = AVAILABLE_EVENT_ICONS.find((i) => i.id === event.icon);
  const IconComp = iconObj?.component;

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.markerWrapper}>
        <Text style={styles.markerHalo}>●</Text>
        <Text style={styles.markerInner}>●</Text>
        {IconComp ? (
          <IconComp size={22} color={colors.primary} />
        ) : (
          <Text style={styles.markerEmoji}>{event.icon}</Text>
        )}
      </View>
    </Marker>
  );
};

const RomyMap = forwardRef<any, RomyMapProps>(({
  mapRegion,
  onLongPress,
  onRegionChangeComplete,
  localEvents,
  onSelectEvent,
  style,
  children
}, ref) => {
  return (
    <MapView
      ref={ref}
      style={style}
      initialRegion={mapRegion}
      showsUserLocation={true}
      onLongPress={onLongPress}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {localEvents?.map((event: any) => (
        <EventMarker
          key={event.id}
          event={event}
          onPress={() => onSelectEvent(event)}
        />
      ))}
      {children}
    </MapView>
  );
});

RomyMap.displayName = 'RomyMap';

export default RomyMap;

const styles = StyleSheet.create({
  markerWrapper: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerHalo: {
    position: 'absolute',
    fontSize: 56,
    color: colors.primary,
    textAlign: 'center',
    includeFontPadding: false,
  },
  markerInner: {
    position: 'absolute',
    fontSize: 48,
    color: '#FFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  markerEmoji: {
    fontSize: 20,
  },
});
