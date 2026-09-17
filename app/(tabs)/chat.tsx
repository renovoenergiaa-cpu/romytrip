import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Image, ActivityIndicator, Modal, Alert, Platform, StatusBar } from 'react-native';
import { Search, MessageCircle, Users, User, Plus, X, BellOff, Archive, LogOut, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { spacing, typography, useTheme } from '../../src/theme';
import { useConversations, useStartConversation, useArchiveConversation, useMuteConversation, useLeaveConversation, useDeleteConversation } from '../../src/hooks/useMessenger';
import { useAcceptedConnections } from '../../src/hooks/useConnections';
import { SkeletonChatRow } from '../../src/components/SkeletonLoader';
import { EmptyState } from '../../src/components/EmptyState';

export default function ChatScreen() {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<'Todas' | 'Diretas' | 'Grupos' | 'Arquivadas'>('Todas');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const { data: conversations, isLoading } = useConversations();
  const { data: connections, isLoading: isLoadingConnections } = useAcceptedConnections();
  const { mutate: startConversation, isPending: isStartingChat } = useStartConversation();

  const { mutate: archiveChat, isPending: isArchiving } = useArchiveConversation();
  const { mutate: muteChat, isPending: isMuting } = useMuteConversation();
  const { mutate: leaveChat, isPending: isLeaving } = useLeaveConversation();
  const { mutate: deleteChat, isPending: isDeleting } = useDeleteConversation();
  
  const handleStartChat = (targetUserId: string, name: string) => {
    startConversation(targetUserId, {
      onSuccess: (conversationId) => {
        setModalVisible(false);
        router.push({ pathname: '/chat/[id]', params: { id: conversationId, name, recipientId: targetUserId } });
      }
    });
  };

  const openSettings = (chat: any) => {
    setSelectedChat(chat);
    setIsSettingsVisible(true);
  };

  const handleToggleArchive = () => {
    if (!selectedChat) return;
    archiveChat({ conversationId: selectedChat.id, isArchived: !selectedChat.is_archived }, {
      onSuccess: () => setIsSettingsVisible(false)
    });
  };

  const handleToggleMute = () => {
    if (!selectedChat) return;
    muteChat({ conversationId: selectedChat.id, isMuted: !selectedChat.is_muted }, {
      onSuccess: () => setIsSettingsVisible(false)
    });
  };

  const handleDeleteOrLeave = () => {
    if (!selectedChat) return;
    const isGroup = selectedChat.is_group;
    const title = isGroup ? 'Sair do Grupo' : 'Excluir Conversa';
    const message = isGroup 
      ? 'Tem certeza que deseja sair deste grupo?' 
      : 'Tem certeza que deseja excluir esta conversa?';

    const executeAction = () => {
      if (isGroup) {
        leaveChat({ conversationId: selectedChat.id }, {
          onSuccess: () => setIsSettingsVisible(false)
        });
      } else {
        deleteChat({ conversationId: selectedChat.id }, {
          onSuccess: () => setIsSettingsVisible(false)
        });
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        executeAction();
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: isGroup ? 'Sair' : 'Excluir', 
            style: 'destructive', 
            onPress: executeAction
          }
        ]
      );
    }
  };
  
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversas</Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.xl }}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput 
            placeholder="Buscar conversas..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={styles.filtersRow}>
            {['Todas', 'Diretas', 'Grupos', 'Arquivadas'].map((f) => (
              <TouchableOpacity 
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f as any)}
              >
                <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ paddingTop: 8 }}>
            {[...Array(6)].map((_, i) => <SkeletonChatRow key={i} />)}
          </View>
        ) : conversations && conversations.length > 0 ? (
          conversations
            .filter((chat: any) => {
              if (filter === 'Arquivadas') return chat.is_archived;
              if (chat.is_archived) return false; // Hide archived from other views
              if (filter === 'Diretas') return !chat.is_group;
              if (filter === 'Grupos') return chat.is_group;
              return true; // Todas
            })
            .map((chat: any) => {
            const isGroup = chat.is_group;
            const isDeletedAccount = !isGroup && (
              chat.other_participant?.name === 'Conta Excluída' || 
              chat.other_participant?.name === 'Usuário Romy' ||
              !chat.other_participant
            );
            const name = isGroup 
              ? chat.name 
              : (isDeletedAccount ? 'Conta Excluída' : (chat.other_participant?.name || 'Viajante'));
            const avatar = isGroup ? null : (isDeletedAccount ? null : (chat.other_participant?.photos?.[0] || defaultAvatar));
            let lastMessage = chat.last_message?.text || 'Nova conversa';
            if (lastMessage.startsWith('[SYS:CALL_ENDED]')) lastMessage = '📞 Chamada encerrada';
            else if (lastMessage.startsWith('[SYS:CALL_REJECTED]')) lastMessage = '📞 Chamada recusada';
            else if (lastMessage.startsWith('[SYS:CALL_OFFER]')) lastMessage = '📞 Chamada perdida';
            
            const time = formatTime(chat.last_message?.created_at || chat.created_at);
            const unread = chat.unread_count || 0;
            const isMuted = chat.is_muted;

            return (
              <TouchableOpacity 
                key={chat.id} 
                style={styles.chatRow}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.id, name, recipientId: chat.other_participant?.id } })}
                onLongPress={() => openSettings(chat)}
              >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  {isDeletedAccount ? (
                    <View style={[styles.avatarImage, { backgroundColor: isDark ? '#334155' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                      <User size={26} color={isDark ? '#94A3B8' : '#64748B'} />
                    </View>
                  ) : avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarImage, styles.avatarGroup]}>
                      <Users size={28} color="#FFF" />
                    </View>
                  )}
                </View>

                {/* Chat Info */}
                <View style={styles.chatInfo}>
                  <View style={styles.nameRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.chatName}>{name}</Text>
                      {isGroup && (
                        <View style={styles.groupBadge}>
                          <Text style={styles.groupBadgeText}>Grupo</Text>
                        </View>
                      )}
                      {isMuted && <BellOff size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />}
                    </View>
                    <Text style={[styles.timeText, unread > 0 && styles.timeTextUnread]}>{time}</Text>
                  </View>

                  <View style={styles.messageRow}>
                    <Text style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]} numberOfLines={1}>
                      {lastMessage}
                    </Text>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma conversa ainda"
            subtitle="Conecte-se com viajantes e comece a trocar experiências!"
            ctaLabel="Nova Conversa"
            onCta={() => setModalVisible(true)}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      {/* New Chat Modal */}
      <Modal visible={isModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Conversa</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isLoadingConnections ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
              ) : connections && connections.length > 0 ? (
                connections.map((conn: any) => (
                  <TouchableOpacity 
                    key={conn.id} 
                    style={styles.connectionItem}
                    onPress={() => handleStartChat(conn.id, conn.name)}
                    disabled={isStartingChat}
                  >
                    <Image 
                      source={{ uri: conn.photos?.[0] || defaultAvatar }} 
                      style={styles.connectionAvatar} 
                    />
                    <Text style={styles.connectionName}>{conn.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>Você ainda não tem conexões para conversar.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isSettingsVisible} animationType="fade" transparent={true}>
        <View style={styles.settingsOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsSettingsVisible(false)} />
          <View style={styles.settingsContent}>
            <View style={styles.dragHandle} />
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>
                {selectedChat?.is_group ? selectedChat?.name : (selectedChat?.other_participant?.name || 'Opções')}
              </Text>
            </View>

            <TouchableOpacity style={styles.actionRow} onPress={handleToggleArchive} disabled={isArchiving}>
              <View style={styles.actionIconContainer}>
                <Archive size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>{selectedChat?.is_archived ? 'Desarquivar' : 'Arquivar'}</Text>
              {isArchiving && <ActivityIndicator color={colors.textPrimary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={handleToggleMute} disabled={isMuting}>
              <View style={styles.actionIconContainer}>
                <BellOff size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>{selectedChat?.is_muted ? 'Ativar Notificações' : 'Silenciar'}</Text>
              {isMuting && <ActivityIndicator color={colors.textPrimary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleDeleteOrLeave} disabled={isDeleting || isLeaving}>
              <View style={[styles.actionIconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                {selectedChat?.is_group ? <LogOut size={22} color="#EF4444" /> : <Trash2 size={22} color="#EF4444" />}
              </View>
              <Text style={[styles.actionText, { color: '#EF4444' }]}>
                {selectedChat?.is_group ? 'Sair do Grupo' : 'Excluir Conversa'}
              </Text>
              {(isDeleting || isLeaving) && <ActivityIndicator color="#EF4444" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.md : spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.md,
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarGroup: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.background,
  },
  chatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  groupBadge: {
    backgroundColor: isDark ? 'rgba(99, 56, 250, 0.2)' : '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  groupBadgeText: {
    fontSize: 10,
    color: isDark ? '#8A6AFB' : colors.primary,
    fontWeight: 'bold',
  },
  groupMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timeTextUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.md,
  },
  lastMessageUnread: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    paddingTop: 12,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  connectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  connectionName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  settingsContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? '#3A3A3A' : '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  settingsHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
