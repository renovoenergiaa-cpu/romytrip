import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme, type ThemeColors } from '../theme';
import { eventIcon } from '../features/events/eventIcons';
import { MapPin } from '../features/onboarding/icons';

export interface RomyMapProps {
  mapRegion: any;
  onLongPress: (e: any) => void;
  onRegionChangeComplete: (region: any) => void;
  localEvents?: any[];
  onSelectEvent: (event: any) => void;
  /** Só o web usa (o celular mostra o pino no centro da tela). */
  draftPin?: { latitude: number; longitude: number } | null;
  style?: any;
  children?: React.ReactNode;
}

const EventMarker = ({ event, onPress }: { event: any; onPress: () => void }) => {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  // O ícone é desenhado uma vez e depois o marcador para de redesenhar (economiza o mapa)
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const Glyph = eventIcon(event.icon)?.component ?? MapPin;

  return (
    <Marker coordinate={{ latitude: event.latitude, longitude: event.longitude }} onPress={onPress} tracksViewChanges={tracksViewChanges}>
      <View style={s.marker}>
        <Glyph size={22} weight="fill" color={colors.primary} />
      </View>
    </Marker>
  );
};

const RomyMap = forwardRef<any, RomyMapProps>(({ mapRegion, onLongPress, onRegionChangeComplete, localEvents, onSelectEvent, style, children }, ref) => {
  return (
    <MapView ref={ref} style={style} initialRegion={mapRegion} showsUserLocation onLongPress={onLongPress} onRegionChangeComplete={onRegionChangeComplete}>
      {localEvents?.map((event: any) => (
        <EventMarker key={event.id} event={event} onPress={() => onSelectEvent(event)} />
      ))}
      {children}
    </MapView>
  );
});

RomyMap.displayName = 'RomyMap';

export default RomyMap;

const getStyles = (c: ThemeColors) => StyleSheet.create({
  marker: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, borderWidth: 2, borderColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
