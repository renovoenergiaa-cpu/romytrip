import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, type ThemeColors } from '../theme';
import { eventIcon } from '../features/events/eventIcons';
import { Compass, MapPin } from '../features/onboarding/icons';
import { WEB_MAP_DOC } from './webMapDoc';

export interface RomyMapProps {
  mapRegion: any;
  onLongPress: (e: any) => void;
  onRegionChangeComplete: (region: any) => void;
  localEvents?: any[];
  onSelectEvent: (event: any) => void;
  /** Ponto escolhido para o novo evento (o celular usa o pino no centro e ignora). */
  draftPin?: { latitude: number; longitude: number } | null;
  style?: any;
  children?: React.ReactNode;
}

// Largura de tela em graus -> nível de zoom do mapa
const zoomFor = (latitudeDelta?: number) => (latitudeDelta ? Math.max(3, Math.min(18, Math.round(Math.log2(360 / latitudeDelta)))) : 14);

// Mapa do web: página própria (webMapDoc) dentro de um iframe, para saber onde a pessoa segurou.
const RomyMap = forwardRef<any, RomyMapProps>(({ mapRegion, onLongPress, onRegionChangeComplete, localEvents = [], onSelectEvent, draftPin, style, children }, ref) => {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);

  const post = useCallback((msg: Record<string, unknown>) => {
    frame.current?.contentWindow?.postMessage({ romy: 1, ...msg }, '*');
  }, []);

  const pushState = useCallback(() => {
    post({
      type: 'state',
      dark: isDark,
      me: mapRegion ? { lat: mapRegion.latitude, lon: mapRegion.longitude } : null,
      draft: draftPin ? { lat: draftPin.latitude, lon: draftPin.longitude } : null,
      events: localEvents.map((e) => ({ id: String(e.id), lat: e.latitude, lon: e.longitude, label: '' })),
    });
  }, [post, isDark, mapRegion, draftPin, localEvents]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (r: any) => {
      post({ type: 'center', lat: r.latitude, lon: r.longitude, z: zoomFor(r.latitudeDelta) });
      onRegionChangeComplete?.(r);
    },
  }));

  // Mensagens vindas do mapa
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.romy) return;
      const d = e.data;
      if (d.type === 'ready') {
        ready.current = true;
        if (mapRegion) post({ type: 'center', lat: mapRegion.latitude, lon: mapRegion.longitude, z: zoomFor(mapRegion.latitudeDelta) });
        pushState();
      } else if (d.type === 'longpress') {
        onLongPress({ nativeEvent: { coordinate: { latitude: d.lat, longitude: d.lon } } });
      } else if (d.type === 'select') {
        const found = localEvents.find((ev) => String(ev.id) === String(d.id));
        if (found) onSelectEvent(found);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [mapRegion, localEvents, onLongPress, onSelectEvent, post, pushState]);

  // Eventos, localização e ponto escolhido mudaram
  useEffect(() => { if (ready.current) pushState(); }, [pushState]);

  return (
    <View style={[s.container, style]}>
      <View style={s.frame}>
        <iframe ref={frame} title="Mapa da região" srcDoc={WEB_MAP_DOC} style={{ width: '100%', height: '100%', border: 'none' }} />
      </View>

      {draftPin ? null : (
      <View style={s.card} pointerEvents="box-none">
        <View style={s.head}>
          <Compass size={20} weight="duotone" color={colors.primary} />
          <Text style={s.heading}>{localEvents.length === 1 ? '1 evento rolando por perto' : `${localEvents.length} eventos rolando por perto`}</Text>
        </View>

        {localEvents.length === 0 ? (
          <Text style={s.empty}>Ninguém criou um evento por perto ainda. Segure no mapa, no endereço, para criar o primeiro.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>
            {localEvents.map((evt) => {
              const Glyph = eventIcon(evt.icon)?.component ?? MapPin;
              return (
                <Pressable key={evt.id} onPress={() => onSelectEvent(evt)} accessibilityRole="button" accessibilityLabel={`Ver evento ${evt.title || ''}`} style={({ pressed }) => [s.chip, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <View style={s.chipIcon}><Glyph size={22} weight="duotone" color={colors.primary} /></View>
                  <View style={{ maxWidth: 170 }}>
                    <Text style={s.chipTitle} numberOfLines={1}>{evt.title || 'Evento'}</Text>
                    <Text style={s.chipPlace} numberOfLines={1}>{evt.location_name || 'Ver detalhes'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
      )}

      {children}
    </View>
  );
});

RomyMap.displayName = 'RomyMapWeb';

export default RomyMap;

const getStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, position: 'relative', backgroundColor: c.background },
  frame: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' },
  card: {
    position: 'absolute', bottom: 16, left: 16, right: 16, padding: 14, gap: 10, borderRadius: 22,
    backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  empty: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  list: { gap: 10, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingRight: 14, borderRadius: 16, backgroundColor: c.surface },
  chipIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  chipTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  chipPlace: { fontSize: 13, color: c.textSecondary },
});
