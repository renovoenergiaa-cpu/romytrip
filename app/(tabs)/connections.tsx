import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors } from '../../src/theme';
import {
  useAcceptedConnections, useDiscoveryPrefs, useDiscoveryTravelers, usePendingRequests, useRequestConnection,
  useRespondConnection, useSaveDiscoveryPrefs, type DiscoveryFilters, type Traveler,
} from '../../src/hooks/useConnections';
import { useStartConversation } from '../../src/hooks/useMessenger';
import { showError } from '../../src/lib/dialogs';
import { SkeletonLine } from '../../src/components/SkeletonLoader';
import { ChatEmpty, FilterChip } from '../../src/features/chat/components';
import { Deck, type Decision } from '../../src/features/connections/Deck';
import { ConnectionRow, FiltersSheet, RequestCard, Toast, type DiscoverySettings } from '../../src/features/connections/components';
import { Compass, Handshake, SlidersHorizontal, Tray, WifiSlash } from '../../src/features/onboarding/icons';

type Tab = 'descobrir' | 'pedidos' | 'conectados';

const firstName = (name?: string | null) => String(name ?? '').trim().split(/\s+/)[0] || 'Viajante';
const DEFAULT_RANGE = { minAge: 18, maxAge: 120, budget: 'all' };

// Mensagens do banco em inglês viram um texto que a pessoa entende
const friendly = (e: any, fallback: string) => {
  const msg = String(e?.message ?? '');
  if (!msg || /row-level security|violates|permission denied|duplicate key/i.test(msg)) return fallback;
  if (/failed to fetch|network/i.test(msg)) return 'Confira sua internet e tente de novo.';
  return msg;
};

export default function ConnectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('descobrir');
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [passed, setPassed] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersKey, setFiltersKey] = useState(0);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const prefs = useDiscoveryPrefs();
  const savePrefs = useSaveDiscoveryPrefs();
  const filters: DiscoveryFilters = { gender: prefs.data?.gender ?? 'all', ...range };
  const discovery = useDiscoveryTravelers(filters, !prefs.isLoading);
  const requests = usePendingRequests();
  const connections = useAcceptedConnections();
  const sendRequest = useRequestConnection();
  const respond = useRespondConnection();
  const startChat = useStartConversation();

  // O aviso some sozinho; um aviso novo reinicia a contagem
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (text: string) => setToast((prev) => ({ id: (prev?.id ?? 0) + 1, text }));

  const queue = (discovery.data ?? []).filter((t) => !passed.includes(t.id) && !requested.includes(t.id));
  const current = queue[0];
  const next = queue[1];
  const pendingCount = requests.data?.length ?? 0;
  const filtersActive = filters.gender !== 'all' || range.minAge !== DEFAULT_RANGE.minAge || range.maxAge !== DEFAULT_RANGE.maxAge || range.budget !== 'all';

  const openProfile = (id: string) => router.push(`/user/${id}`);

  /* ─── Descobrir ─── */
  const handleDecide = (decision: Decision, t: Traveler) => {
    if (decision !== 'connect') return;
    sendRequest.mutate(t.id, {
      onSuccess: () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        notify(`Pedido enviado para ${firstName(t.name)}`);
      },
      onError: (e) => {
        setRequested((ids) => ids.filter((id) => id !== t.id)); // volta para a fila
        showError('Não foi possível enviar o pedido', friendly(e, 'Tente de novo em instantes.'));
      },
    });
  };
  const handleDone = (decision: Decision, t: Traveler) => {
    if (decision === 'connect') setRequested((ids) => [...ids, t.id]);
    else setPassed((ids) => [...ids, t.id]);
  };

  const applyFilters = async (nextSettings: DiscoverySettings) => {
    const current_ = prefs.data;
    if (current_ && (nextSettings.gender !== current_.gender || nextSettings.invisible !== current_.invisible)) {
      try {
        await savePrefs.mutateAsync({ gender: nextSettings.gender, invisible: nextSettings.invisible });
      } catch (e) {
        showError('Não foi possível salvar', friendly(e, 'Tente de novo em instantes.'));
        return;
      }
    }
    setRange({ minAge: nextSettings.minAge, maxAge: nextSettings.maxAge, budget: nextSettings.budget });
    setPassed([]);
    setFiltersOpen(false);
  };

  /* ─── Pedidos e conexões ─── */
  const answer = (request: any, status: 'accepted' | 'rejected') => {
    const name = firstName(request.users?.name);
    respond.mutate({ connectionId: request.id, status }, {
      onSuccess: () => notify(status === 'accepted' ? `Você e ${name} agora estão conectados` : 'Pedido recusado'),
      onError: (e) => showError('Não foi possível responder', friendly(e, 'Tente de novo em instantes.')),
    });
  };

  const chatWith = (person: { id: string; name?: string | null }) => {
    startChat.mutate(person.id, {
      onSuccess: (conversationId) => router.push({ pathname: '/chat/[id]', params: { id: conversationId, name: person.name ?? '', recipientId: person.id } }),
      onError: (e) => showError('Não foi possível abrir a conversa', friendly(e, 'Tente de novo em instantes.')),
    });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'descobrir', label: 'Descobrir' },
    { id: 'pedidos', label: pendingCount ? `Pedidos (${pendingCount})` : 'Pedidos' },
    { id: 'conectados', label: 'Conectados' },
  ];

  const renderDiscover = () => {
    if (prefs.isLoading || discovery.isLoading) {
      return (
        <View style={s.skeleton} accessibilityLabel="Carregando viajantes">
          <SkeletonLine width="100%" height={Math.min(width, 560) * 1.25 - 50} borderRadius={28} />
          <SkeletonLine width="100%" height={90} borderRadius={20} />
        </View>
      );
    }
    if (discovery.isError && !discovery.data) {
      return <ChatEmpty icon={WifiSlash} title="Não conseguimos carregar" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => discovery.refetch()} secondary />;
    }
    if (!current) {
      return passed.length > 0 ? (
        <ChatEmpty icon={Compass} title="Você viu todo mundo por aqui" text="Quem você passou pode aparecer de novo. Novas pessoas chegam conforme o Romy cresce." action="Ver de novo" onAction={() => { setPassed([]); discovery.refetch(); }} secondary />
      ) : (
        <ChatEmpty
          icon={Compass}
          title="Ninguém novo por aqui"
          text={filtersActive ? 'Tente afrouxar os filtros para ver mais viajantes.' : 'Novas pessoas chegam conforme o Romy cresce. Volte mais tarde.'}
          action={filtersActive ? 'Mudar filtros' : undefined}
          onAction={filtersActive ? () => { setFiltersKey((k) => k + 1); setFiltersOpen(true); } : undefined}
          secondary
        />
      );
    }
    return <Deck current={current} next={next} onDecide={handleDecide} onDone={handleDone} onOpenProfile={(t) => openProfile(t.id)} />;
  };

  const renderRequests = () => {
    if (requests.isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} accessibilityLabel="Carregando pedidos" />;
    if (requests.isError && !requests.data) {
      return <ChatEmpty icon={WifiSlash} title="Não conseguimos carregar" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => requests.refetch()} secondary />;
    }
    if (!pendingCount) {
      return <ChatEmpty icon={Tray} title="Nenhum pedido por agora" text="Quando alguém quiser se conectar com você, o pedido aparece aqui." action="Descobrir viajantes" onAction={() => setTab('descobrir')} secondary />;
    }
    return (
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {requests.data!.map((r: any) => (
          <RequestCard
            key={r.id}
            request={r}
            busy={respond.isPending && respond.variables?.connectionId === r.id}
            onOpen={() => openProfile(r.sender_id)}
            onAccept={() => answer(r, 'accepted')}
            onDecline={() => answer(r, 'rejected')}
          />
        ))}
      </ScrollView>
    );
  };

  const renderConnections = () => {
    if (connections.isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} accessibilityLabel="Carregando conexões" />;
    if (connections.isError && !connections.data) {
      return <ChatEmpty icon={WifiSlash} title="Não conseguimos carregar" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => connections.refetch()} secondary />;
    }
    const people = (connections.data ?? []).filter(Boolean);
    if (!people.length) {
      return <ChatEmpty icon={Handshake} title="Você ainda não tem conexões" text="Em Descobrir, toque em Conectar em quem combina com você." action="Descobrir viajantes" onAction={() => setTab('descobrir')} />;
    }
    return (
      <ScrollView contentContainerStyle={[s.list, { gap: 2 }]} showsVerticalScrollIndicator={false}>
        {people.map((p: any) => (
          <ConnectionRow
            key={p.id}
            person={p}
            starting={startChat.isPending && startChat.variables === p.id}
            onOpen={() => openProfile(p.id)}
            onChat={() => chatWith(p)}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.titleRow}>
          <Text style={s.title} accessibilityRole="header">Conexões</Text>
          {tab === 'descobrir' && (
            <Pressable
              onPress={() => { setFiltersKey((k) => k + 1); setFiltersOpen(true); }}
              disabled={!prefs.data}
              accessibilityRole="button"
              accessibilityLabel={filtersActive ? 'Filtros (ativos)' : 'Filtros'}
              hitSlop={6}
              style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
            >
              <SlidersHorizontal size={22} weight="duotone" color={colors.textPrimary} />
              {filtersActive && <View style={s.dot} />}
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityRole="tablist">
          {tabs.map((t) => <FilterChip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />)}
        </ScrollView>
      </View>

      <View style={s.body}>
        {tab === 'descobrir' ? renderDiscover() : tab === 'pedidos' ? renderRequests() : renderConnections()}
      </View>

      {toast ? <Toast key={toast.id} message={toast.text} top={insets.top + 12} /> : null}

      {prefs.data && (
        <FiltersSheet
          key={filtersKey}
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          initial={{ ...range, gender: prefs.data.gender, invisible: prefs.data.invisible }}
          saving={savePrefs.isPending}
          onApply={applyFilters}
        />
      )}
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  pressed: { transform: [{ scale: 0.96 }] },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  title: { fontSize: 30, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  dot: { position: 'absolute', top: 9, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary, borderWidth: 2, borderColor: c.card },
  chips: { gap: 8, paddingRight: 20 },
  body: { flex: 1 },
  skeleton: { paddingHorizontal: 20, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
