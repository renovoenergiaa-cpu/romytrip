import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import { Sheet } from './Sheet';
import { useTheme, type ThemeColors } from '../theme';
import { useRequestJoinEvent, useEventRequests, useUpdateEventRequest, useUserEventRequestStatus } from '../hooks/useEvents';
import { showError } from '../lib/dialogs';
import { eventIcon } from '../features/events/eventIcons';
import { Avatar } from '../features/onboarding/components';
import { CalendarBlank, Check, Clock, MapPin, UserCheck, X, Compass } from '../features/onboarding/icons';

interface EventDetailsModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  currentUserId: string | null;
}

const clock = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const longDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const text = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function EventDetailsModal({ visible, event, onClose, currentUserId }: EventDetailsModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const isOwner = event ? currentUserId === event.user_id : false;
  const [tab, setTab] = useState<'details' | 'requests'>('details');

  const { data: requests, isLoading: loadingRequests, isError: requestsFailed, refetch: refetchRequests } = useEventRequests(isOwner && event ? event.id : null);
  const { mutate: requestJoin, isPending: requesting } = useRequestJoinEvent();
  const { data: myStatus, isLoading: loadingStatus } = useUserEventRequestStatus(event?.id ?? null);
  const { mutate: updateRequest } = useUpdateEventRequest();

  const pending = requests?.filter((r: any) => r.status === 'pending').length ?? 0;
  const EventGlyph = eventIcon(event?.icon)?.component ?? Compass;
  const organizer = String(event?.users?.name ?? '').trim() || 'Viajante';

  const close = () => { setTab('details'); onClose(); };
  const answer = (requestId: string, status: 'accepted' | 'rejected') =>
    updateRequest({ requestId, status }, { onError: () => showError('Não foi possível responder', 'Tente de novo em instantes.') });

  return (
    <Sheet visible={visible && !!event} onClose={close} title={event?.title || 'Evento'} fill>
      {event ? (
        <>
          <View style={s.head}>
            <View style={s.iconTile}><EventGlyph size={28} weight="duotone" color={colors.primary} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.by}>Organizado por</Text>
              <View style={s.organizer}>
                <Avatar photo={event.users?.photos?.[0]} name={organizer} size={24} />
                <Text style={s.organizerName} numberOfLines={1}>{organizer}</Text>
              </View>
            </View>
          </View>

          {isOwner ? (
            <View style={s.tabs} accessibilityRole="tablist">
              {([['details', 'Detalhes'], ['requests', pending ? `Pedidos (${pending})` : 'Pedidos']] as const).map(([id, label]) => (
                <Pressable key={id} onPress={() => setTab(id)} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} style={[s.tab, tab === id && s.tabOn]}>
                  <Text style={[s.tabText, tab === id && s.tabTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {tab === 'details' ? (
            <View style={{ flex: 1 }}>
              <View style={s.info}>
                <View style={s.infoRow}><MapPin size={20} weight="duotone" color={colors.primary} /><Text style={s.infoText}>{event.location_name || 'Local marcado no mapa'}</Text></View>
                <View style={s.infoRow}><CalendarBlank size={20} weight="duotone" color={colors.primary} /><Text style={s.infoText}>{longDate(event.start_time)}</Text></View>
                <View style={s.infoRow}><Clock size={20} weight="duotone" color={colors.primary} /><Text style={s.infoText}>{`${clock(event.start_time)} às ${clock(event.end_time)}`}</Text></View>
              </View>

              <Text style={s.section}>Sobre o evento</Text>
              <Text style={s.description} selectable>{event.description?.trim() || 'O organizador não escreveu detalhes.'}</Text>

              <View style={{ flex: 1 }} />

              {!isOwner ? (
                loadingStatus ? (
                  <ActivityIndicator color={colors.primary} />
                ) : myStatus === 'pending' ? (
                  <View style={s.statusBox}><Clock size={20} weight="duotone" color={colors.textSecondary} /><Text style={s.statusText}>Pedido enviado, aguardando resposta</Text></View>
                ) : myStatus === 'accepted' ? (
                  <View style={[s.statusBox, { backgroundColor: colors.successSoft }]}><UserCheck size={20} weight="duotone" color={colors.success} /><Text style={[s.statusText, { color: colors.success }]}>Você está no evento</Text></View>
                ) : myStatus === 'rejected' ? (
                  <View style={[s.statusBox, { backgroundColor: colors.errorSoft }]}><X size={20} weight="bold" color={colors.error} /><Text style={[s.statusText, { color: colors.error }]}>Pedido recusado</Text></View>
                ) : (
                  <Pressable
                    onPress={() => event.id && requestJoin({ eventId: event.id }, { onError: () => showError('Não foi possível enviar o pedido', 'Tente de novo em instantes.') })}
                    disabled={requesting}
                    accessibilityRole="button"
                    style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.98 }] }]}
                  >
                    {requesting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.ctaText}>Pedir para entrar</Text>}
                  </Pressable>
                )
              ) : null}
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {loadingRequests ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
              ) : requestsFailed ? (
                <View style={s.center}>
                  <Text style={s.emptyText}>Não conseguimos carregar os pedidos.</Text>
                  <Pressable onPress={() => refetchRequests()} accessibilityRole="button" style={s.softBtn}><Text style={s.softBtnText}>Tentar de novo</Text></Pressable>
                </View>
              ) : requests && requests.length > 0 ? (
                <FlatList
                  data={requests}
                  keyExtractor={(r: any) => String(r.id)}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                  renderItem={({ item }: { item: any }) => {
                    const name = String(item.users?.name ?? '').trim() || 'Viajante';
                    return (
                      <View style={s.request}>
                        <Avatar photo={item.users?.photos?.[0]} name={name} size={44} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.requestName} numberOfLines={1}>{name}</Text>
                          <Text style={s.requestStatus}>{item.status === 'pending' ? 'Aguardando você' : item.status === 'accepted' ? 'Aceito' : 'Recusado'}</Text>
                        </View>
                        {item.status === 'pending' ? (
                          <View style={s.requestActions}>
                            <Pressable onPress={() => answer(item.id, 'rejected')} accessibilityRole="button" accessibilityLabel={`Recusar ${name}`} style={[s.round, { backgroundColor: colors.errorSoft }]}><X size={20} weight="bold" color={colors.error} /></Pressable>
                            <Pressable onPress={() => answer(item.id, 'accepted')} accessibilityRole="button" accessibilityLabel={`Aceitar ${name}`} style={[s.round, { backgroundColor: colors.successSoft }]}><Check size={20} weight="bold" color={colors.success} /></Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  }}
                />
              ) : (
                <View style={s.center}><Text style={s.emptyText}>Ninguém pediu para entrar ainda.</Text></View>
              )}
            </View>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  iconTile: { width: 56, height: 56, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  by: { fontSize: 13, color: c.textMuted },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  organizerName: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: c.textPrimary },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
  tabOn: { backgroundColor: c.primary },
  tabText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  tabTextOn: { color: c.onPrimary },
  info: { padding: 14, borderRadius: 18, backgroundColor: c.surface, gap: 12, marginBottom: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, fontSize: 16, color: c.textPrimary },
  section: { fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 6 },
  description: { fontSize: 16, lineHeight: 23, color: c.textSecondary },
  statusBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, borderRadius: 18, backgroundColor: c.surface, paddingHorizontal: 16 },
  statusText: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: c.textSecondary, textAlign: 'center' },
  cta: { height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 32 },
  emptyText: { fontSize: 16, color: c.textSecondary, textAlign: 'center' },
  softBtn: { height: 44, paddingHorizontal: 20, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  softBtnText: { fontSize: 15, fontWeight: '700', color: c.primary },
  request: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: c.surface },
  requestName: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  requestStatus: { fontSize: 13, color: c.textSecondary },
  requestActions: { flexDirection: 'row', gap: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
