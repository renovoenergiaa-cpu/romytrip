import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../../src/theme';
import {
  useConversations, useCurrentUserId, useStartConversation, useArchiveConversation,
  useMuteConversation, useLeaveConversation, useDeleteConversation, type Conversation,
} from '../../src/hooks/useMessenger';
import { useAcceptedConnections } from '../../src/hooks/useConnections';
import { SkeletonChatRow } from '../../src/components/SkeletonLoader';
import { confirmAction, showError } from '../../src/lib/dialogs';
import {
  ChatActionsSheet, ChatEmpty, ConversationRow, describeConversation, FilterChip, NewChatSheet, SearchField,
} from '../../src/features/chat/components';
import { messagePreview } from '../../src/features/chat/format';
import { ChatCircleDots, MagnifyingGlass, Plus, Tray, UsersThree, WifiSlash } from '../../src/features/onboarding/icons';

type FilterId = 'all' | 'direct' | 'group' | 'archived';
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'direct', label: 'Diretas' },
  { id: 'group', label: 'Grupos' },
  { id: 'archived', label: 'Arquivadas' },
];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const myId = useCurrentUserId();

  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const { data: conversations, isLoading, isError, refetch, isRefetching } = useConversations();
  const {
    data: connections, isLoading: loadingConnections, isError: connectionsFailed, refetch: refetchConnections,
  } = useAcceptedConnections();
  const { mutate: startConversation, isPending: isStarting, variables: startingId } = useStartConversation();
  const { mutate: archiveChat, isPending: isArchiving } = useArchiveConversation();
  const { mutate: muteChat, isPending: isMuting } = useMuteConversation();
  const { mutate: leaveChat, isPending: isLeaving } = useLeaveConversation();
  const { mutate: deleteChat, isPending: isDeleting } = useDeleteConversation();

  // Voltar para a aba atualiza a lista (conversa nova, mensagens lidas em outra tela)
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) { firstFocus.current = false; return; }
      refetch();
    }, [refetch]),
  );

  const openChat = (chat: Conversation) => {
    const name = chat.is_group ? chat.name : chat.other_participant?.name;
    router.push({ pathname: '/chat/[id]', params: { id: chat.id, name: name ?? '', recipientId: chat.other_participant?.id ?? '' } });
  };

  const startChat = (person: { id: string; name: string | null }) => {
    startConversation(person.id, {
      onSuccess: (conversationId) => {
        setNewChatOpen(false);
        router.push({ pathname: '/chat/[id]', params: { id: conversationId, name: person.name ?? '', recipientId: person.id } });
      },
      onError: (err) => showError('Não foi possível iniciar a conversa', err.message || 'Tente de novo em instantes.'),
    });
  };

  const toggleArchive = () => {
    if (!selected) return;
    archiveChat(
      { conversationId: selected.id, isArchived: !selected.is_archived },
      { onSuccess: () => setSelected(null), onError: () => showError('Não foi possível arquivar', 'Tente de novo em instantes.') },
    );
  };

  const toggleMute = () => {
    if (!selected) return;
    muteChat(
      { conversationId: selected.id, isMuted: !selected.is_muted },
      { onSuccess: () => setSelected(null), onError: () => showError('Não foi possível alterar as notificações', 'Tente de novo em instantes.') },
    );
  };

  const leaveOrDelete = async () => {
    if (!selected) return;
    const chat = selected;
    const ok = await confirmAction(
      chat.is_group
        ? { title: 'Sair do grupo?', message: 'Você deixa de receber as mensagens deste grupo.', confirmLabel: 'Sair', destructive: true }
        : { title: 'Excluir conversa?', message: 'Ela sai da sua lista e o histórico some para você.', confirmLabel: 'Excluir', destructive: true },
    );
    if (!ok) return;
    const done = { onSuccess: () => setSelected(null), onError: () => showError('Não foi possível concluir', 'Tente de novo em instantes.') };
    if (chat.is_group) leaveChat({ conversationId: chat.id }, done);
    else deleteChat({ conversationId: chat.id }, done);
  };

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => (conversations ?? []).filter((chat) => {
    if (filter === 'archived') { if (!chat.is_archived) return false; }
    else {
      if (chat.is_archived) return false;
      if (filter === 'direct' && chat.is_group) return false;
      if (filter === 'group' && !chat.is_group) return false;
    }
    if (!needle) return true;
    const { name } = describeConversation(chat);
    const { text } = messagePreview(chat.last_message, myId, chat.is_group);
    return name.toLowerCase().includes(needle) || text.toLowerCase().includes(needle);
  }), [conversations, filter, needle, myId]);

  const findTravelers = () => { setNewChatOpen(false); router.navigate('/(tabs)/connections'); };

  const renderEmpty = () => {
    if (isLoading) return null;
    if (isError && !conversations) {
      return <ChatEmpty icon={WifiSlash} title="Não conseguimos carregar" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => refetch()} secondary />;
    }
    if (needle) {
      return <ChatEmpty icon={MagnifyingGlass} title="Nada encontrado" text={`Nenhuma conversa com “${query.trim()}”.`} action="Limpar busca" onAction={() => setQuery('')} secondary />;
    }
    if (filter === 'archived') {
      return <ChatEmpty icon={Tray} title="Nenhuma conversa arquivada" text="As conversas que você arquivar ficam guardadas aqui." />;
    }
    if (filter === 'group') {
      return <ChatEmpty icon={UsersThree} title="Nenhum grupo ainda" text="Entre em uma comunidade para conversar em grupo com outros viajantes." />;
    }
    if (filter === 'direct') {
      return <ChatEmpty icon={ChatCircleDots} title="Nenhuma conversa direta" text="Escolha uma conexão para começar a conversar." action="Nova conversa" onAction={() => setNewChatOpen(true)} />;
    }
    return (
      <ChatEmpty
        icon={ChatCircleDots}
        title="Suas conversas começam aqui"
        text="Quando você falar com outro viajante, a conversa aparece nesta lista."
        action={connections && connections.length > 0 ? 'Começar uma conversa' : 'Encontrar viajantes'}
        onAction={connections && connections.length > 0 ? () => setNewChatOpen(true) : findTravelers}
      />
    );
  };

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.titleRow}>
          <Text style={s.title} accessibilityRole="header">Conversas</Text>
          <Pressable
            onPress={() => setNewChatOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Nova conversa"
            style={({ pressed }) => [s.newBtn, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Plus size={16} weight="bold" color={colors.primary} />
            <Text style={s.newBtnText}>Nova conversa</Text>
          </Pressable>
        </View>

        <SearchField value={query} onChangeText={setQuery} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityRole="tablist">
          {FILTERS.map((f) => (
            <FilterChip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={s.list}>
          {[...Array(6)].map((_, i) => <SkeletonChatRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(chat) => chat.id}
          renderItem={({ item }) => (
            <ConversationRow chat={item} myId={myId} onPress={() => openChat(item)} onLongPress={() => setSelected(item)} />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.list, { paddingBottom: 24 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
        />
      )}

      <NewChatSheet
        visible={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        people={connections}
        loading={loadingConnections}
        failed={connectionsFailed}
        pendingId={isStarting ? (startingId as string) : null}
        onPick={startChat}
        onFindTravelers={findTravelers}
        onRetry={() => refetchConnections()}
      />

      <ChatActionsSheet
        chat={selected}
        onClose={() => setSelected(null)}
        onArchive={toggleArchive}
        onMute={toggleMute}
        onLeave={leaveOrDelete}
        busy={isArchiving || isMuting || isLeaving || isDeleting}
      />
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
    borderRadius: 999, backgroundColor: c.primarySoft,
  },
  newBtnText: { fontSize: 14, fontWeight: '700', color: c.primary },
  chips: { gap: 8, paddingRight: 20 },
  list: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 90 },
});
