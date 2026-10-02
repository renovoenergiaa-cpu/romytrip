import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors } from '../../src/theme';
import { useMyEvents, useDeleteEvent } from '../../src/hooks/useEvents';
import { useCommunities, useMyCommunities } from '../../src/hooks/useCommunities';
import EditEventModal from '../../src/components/EditEventModal';
import CreateCommunityModal from '../../src/components/CreateCommunityModal';
import { confirmAction, showError } from '../../src/lib/dialogs';
import { eventIcon } from '../../src/features/events/eventIcons';
import { ChatEmpty, FilterChip, SearchField } from '../../src/features/chat/components';
import { plural, soft, typeLook } from '../../src/features/communities/look';
import {
  CalendarBlank, Clock, Globe, MapPin, PencilSimple, Plus, Trash, UsersThree, WifiSlash,
} from '../../src/features/onboarding/icons';

type Tab = 'minhas' | 'descobrir' | 'eventos';
const TABS: { id: Tab; label: string }[] = [
  { id: 'minhas', label: 'Minhas' },
  { id: 'descobrir', label: 'Descobrir' },
  { id: 'eventos', label: 'Meus eventos' },
];

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const dateOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
};

function CommunityCard({ comm, onPress, s, colors }: { comm: any; onPress: () => void; s: ReturnType<typeof getStyles>; colors: ThemeColors }) {
  const { color, Glyph } = typeLook(colors, comm.type);
  // Só mostra o que veio do banco (nada de "1 membro" inventado)
  const members = comm.community_members?.[0]?.count;
  const posts = comm.community_posts?.[0]?.count;
  const meta = [
    typeof members === 'number' ? plural(members, 'membro', 'membros') : null,
    typeof posts === 'number' ? plural(posts, 'publicação', 'publicações') : null,
  ].filter(Boolean).join(' · ');
  const title = String(comm.title ?? '').trim() || 'Comunidade';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Abrir comunidade ${title}`} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      {comm.icon_url
        ? <Image source={{ uri: comm.icon_url }} style={s.cardTile} cachePolicy="memory-disk" />
        : <View style={[s.cardTile, { backgroundColor: soft(color) }]}><Glyph size={26} weight="duotone" color={color} /></View>}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={s.cardTop}>
          <Text style={s.cardTitle} numberOfLines={1}>{title}</Text>
          <View style={[s.tag, { backgroundColor: soft(color) }]}><Text style={[s.tagText, { color }]}>{comm.type ?? 'Comunidade'}</Text></View>
        </View>
        {comm.description ? <Text style={s.cardDesc} numberOfLines={2}>{comm.description}</Text> : null}
        {comm.location ? (
          <View style={s.meta}><MapPin size={14} weight="fill" color={colors.textMuted} /><Text style={s.metaText} numberOfLines={1}>{comm.location}</Text></View>
        ) : null}
        {meta ? <Text style={s.metaText}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function CommunitiesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('minhas');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const mine = useMyCommunities();
  const all = useCommunities();
  const events = useMyEvents();
  const { mutate: deleteEvent } = useDeleteEvent();

  const needle = query.trim().toLowerCase();
  const matches = (c: any) => !needle || String(c.title ?? '').toLowerCase().includes(needle);
  const myList = (mine.data ?? []).filter(matches);
  const allList = (all.data ?? []).filter(matches);

  const handleDelete = async (event: any) => {
    const ok = await confirmAction({ title: 'Excluir evento?', message: `"${event.title}" some do mapa e quem pediu para entrar deixa de vê-lo.`, confirmLabel: 'Excluir', destructive: true });
    if (!ok) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    deleteEvent({ eventId: event.id }, { onError: () => showError('Não foi possível excluir', 'Tente de novo em instantes.') });
  };

  const renderState = (q: typeof mine, list: any[], empty: React.ReactNode) => {
    if (q.isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} accessibilityLabel="Carregando" />;
    if (q.isError && !q.data) {
      return <ChatEmpty icon={WifiSlash} title="Não conseguimos carregar" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => q.refetch()} secondary />;
    }
    if (list.length === 0) return needle ? <ChatEmpty icon={UsersThree} title="Nada encontrado" text={`Nenhuma comunidade com “${query.trim()}”.`} action="Limpar busca" onAction={() => setQuery('')} secondary /> : empty;
    return <View style={{ gap: 12 }}>{list.map((c: any) => <CommunityCard key={c.id} comm={c} s={s} colors={colors} onPress={() => router.push(`/community/${c.id}`)} />)}</View>;
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.top}>
          <View style={{ flex: 1 }}><SearchField value={query} onChangeText={setQuery} placeholder="Buscar comunidades" /></View>
          <Pressable onPress={() => setCreateOpen(true)} accessibilityRole="button" accessibilityLabel="Criar comunidade" style={({ pressed }) => [s.create, pressed && s.pressed]}>
            <Plus size={18} weight="bold" color={colors.onPrimary} />
            <Text style={s.createText}>Criar</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityRole="tablist">
          {TABS.map((t) => <FilterChip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />)}
        </ScrollView>

        {tab === 'minhas' && renderState(mine, myList, (
          <ChatEmpty icon={UsersThree} title="Você ainda não está em nenhuma comunidade" text="Crie a sua ou entre em uma na aba Descobrir para conhecer outros viajantes." action="Criar comunidade" onAction={() => setCreateOpen(true)} />
        ))}

        {tab === 'descobrir' && renderState(all, allList, (
          <ChatEmpty icon={Globe} title="Nenhuma comunidade pública ainda" text="Seja a primeira pessoa a criar uma." action="Criar comunidade" onAction={() => setCreateOpen(true)} />
        ))}

        {tab === 'eventos' && (
          events.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} accessibilityLabel="Carregando" />
          : events.isError && !events.data ? <ChatEmpty icon={WifiSlash} title="Não conseguimos carregar" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => events.refetch()} secondary />
          : events.data && events.data.length > 0 ? (
            <View style={{ gap: 12 }}>
              {events.data.map((event: any) => {
                const Glyph = eventIcon(event.icon)?.component ?? MapPin;
                return (
                  <View key={event.id} style={s.event}>
                    <View style={s.eventTop}>
                      <View style={s.eventTile}><Glyph size={24} weight="duotone" color={colors.primary} /></View>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={s.cardTitle} numberOfLines={1}>{event.title}</Text>
                        <View style={s.meta}><MapPin size={14} weight="fill" color={colors.textMuted} /><Text style={s.metaText} numberOfLines={1}>{event.location_name || 'Local marcado no mapa'}</Text></View>
                      </View>
                    </View>
                    <View style={s.pills}>
                      <View style={s.pill}><CalendarBlank size={14} weight="duotone" color={colors.primary} /><Text style={s.pillText}>{dateOf(event.start_time)}</Text></View>
                      <View style={s.pill}><Clock size={14} weight="duotone" color={colors.primary} /><Text style={s.pillText}>{`${timeOf(event.start_time)} às ${timeOf(event.end_time)}`}</Text></View>
                    </View>
                    <View style={s.actions}>
                      <Pressable onPress={() => setEditingEvent(event)} accessibilityRole="button" style={({ pressed }) => [s.action, s.actionEdit, pressed && s.pressed]}>
                        <PencilSimple size={18} weight="bold" color={colors.primary} /><Text style={[s.actionText, { color: colors.primary }]}>Editar</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDelete(event)} accessibilityRole="button" style={({ pressed }) => [s.action, s.actionDelete, pressed && s.pressed]}>
                        <Trash size={18} weight="bold" color={colors.error} /><Text style={[s.actionText, { color: colors.error }]}>Excluir</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <ChatEmpty icon={CalendarBlank} title="Você ainda não criou eventos" text="Na aba Tá rolando, segure no mapa no endereço do evento para reunir viajantes por lá." />
          )
        )}
      </ScrollView>

      <EditEventModal visible={!!editingEvent} event={editingEvent} onClose={() => setEditingEvent(null)} />
      <CreateCommunityModal visible={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  pressed: { transform: [{ scale: 0.98 }] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  create: { height: 50, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
  createText: { fontSize: 15, fontWeight: '700', color: c.onPrimary },
  chips: { gap: 8, paddingRight: 20 },

  card: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  cardTile: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flexShrink: 1, fontSize: 17, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },
  tag: { height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: 'center' },
  tagText: { fontSize: 11, fontWeight: '800' },
  cardDesc: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: c.textMuted, flexShrink: 1 },

  event: { padding: 14, gap: 12, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  eventTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventTile: { width: 48, height: 48, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: c.surface },
  pillText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionEdit: { backgroundColor: c.primarySoft },
  actionDelete: { backgroundColor: c.errorSoft },
  actionText: { fontSize: 15, fontWeight: '700' },
});
