import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Bell,
  Pill,
  Utensils,
  CreditCard,
  Car,
  Check,
  MessageSquare,
  Users,
  X,
  MapPin,
  Send,
  Trash2,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  useHelpRequests,
  useCreateHelpRequest,
  useResolveHelpRequest,
  useHelpReplies,
  useCreateHelpReply,
  useDeleteHelpRequest,
} from '../src/hooks/useDiscovery';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/theme';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG          = '#0A0A0C';
const CARD        = '#141416';
const BORDER      = '#222226';
const MUTED       = '#A1A1AA';
const PRIMARY     = '#6338FA';
const PRIMARY_DIM = 'rgba(99,56,250,0.15)';
const PRIMARY_BDR = 'rgba(99,56,250,0.3)';
const GREEN       = '#22C55E';
const GREEN_DIM   = 'rgba(34,197,94,0.12)';
const RED         = '#EF4444';
const RED_DIM     = 'rgba(239,68,68,0.1)';

// ─── Category config ──────────────────────────────────────────────────────────
type CategoryKey = 'Restaurante' | 'Farmácia' | 'Transporte' | 'Câmbio/ATM' | 'Outros';

const CAT: Record<CategoryKey, { icon: (s: number, c: string) => React.ReactNode; color: string; bg: string }> = {
  'Restaurante': { icon: (s, c) => <Utensils  size={s} color={c} />, color: '#FB923C', bg: 'rgba(251,146,60,0.12)'  },
  'Farmácia':   { icon: (s, c) => <Pill       size={s} color={c} />, color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  'Transporte': { icon: (s, c) => <Car        size={s} color={c} />, color: GREEN,     bg: GREEN_DIM               },
  'Câmbio/ATM': { icon: (s, c) => <CreditCard size={s} color={c} />, color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  'Outros':     { icon: (s, c) => <Bell       size={s} color={c} />, color: MUTED,     bg: 'rgba(161,161,170,0.1)' },
};

function catConf(cat?: string) {
  return CAT[(cat as CategoryKey) ?? 'Outros'] ?? CAT['Outros'];
}

const CATEGORIES: CategoryKey[] = ['Restaurante', 'Farmácia', 'Transporte', 'Câmbio/ATM', 'Outros'];
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80';

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HelpBoardScreen({ isEmbedded }: { isEmbedded?: boolean }) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const s = getStyles(colors, isDark);
  const [filter, setFilter]                     = useState<'all' | 'active' | 'resolved'>('all');
  const [modalVisible, setModalVisible]         = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest]   = useState<any>(null);
  const [newCategory, setNewCategory]           = useState<CategoryKey>('Restaurante');
  const [newContent, setNewContent]             = useState('');
  const [replyText, setReplyText]               = useState('');
  const [currentUserId, setCurrentUserId]       = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: helps,   isLoading }          = useHelpRequests(filter);
  const { mutate: createHelp, isPending: isCreating } = useCreateHelpRequest();
  const { mutate: resolveHelp, isPending: isResolving } = useResolveHelpRequest();
  const { mutate: deleteHelp }                = useDeleteHelpRequest();
  const { mutate: createReply, isPending: isReplying } = useCreateHelpReply();
  const { data: replies, isLoading: isLoadingReplies } = useHelpReplies(selectedRequest?.id ?? '');

  const handleCreate = () => {
    if (!newContent.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createHelp({ category: newCategory, content: newContent, city: 'Local Atual' }, {
      onSuccess: () => { setModalVisible(false); setNewContent(''); },
    });
  };

  const FILTERS: { key: 'all' | 'active' | 'resolved'; label: string }[] = [
    { key: 'all',      label: 'Todas'     },
    { key: 'active',   label: 'Ativas'    },
    { key: 'resolved', label: 'Resolvidas'},
  ];

  return (
    <View style={s.root}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      {!isEmbedded && (
        <View style={s.standaloneHeader}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={22} color={isDark ? '#FFF' : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[s.header, isEmbedded && { paddingTop: 0 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Ajudinha 🤝</Text>
          <Text style={s.headerSub}>Peça ou ofereça ajuda para quem está por perto</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ─── Info banner ──────────────────────────────────────────────── */}
      <View style={s.banner}>
        <Info size={14} color="#C4B5FD" />
        <Text style={s.bannerText}>
          Suas perguntas notificam{' '}
          <Text style={{ color: '#C4B5FD', fontWeight: '700' }}>viajantes no mesmo local</Text>
          . Ajudas resolvidas somem automaticamente.
        </Text>
      </View>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterPill, filter === f.key && s.filterPillActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f.key);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.filterPillText, filter === f.key && s.filterPillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── List ─────────────────────────────────────────────────────── */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
        ) : helps && helps.length > 0 ? (
          helps.map((help: any) => {
            const author     = help.users ?? {};
            const isResolved = help.status === 'resolved';
            const cc         = catConf(help.category);

            return (
              <TouchableOpacity
                key={help.id}
                style={[s.card, isResolved && s.cardResolved]}
                activeOpacity={0.78}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedRequest(help);
                  setDetailsModalVisible(true);
                }}
              >
                {/* Top row: category badge + status */}
                <View style={s.cardTopRow}>
                  <View style={[s.catBadge, { backgroundColor: cc.bg }]}>
                    {cc.icon(12, cc.color)}
                    <Text style={[s.catBadgeText, { color: cc.color }]}>{help.category}</Text>
                  </View>
                  {isResolved ? (
                    <View style={s.resolvedBadge}>
                      <Check size={11} color={GREEN} />
                      <Text style={s.resolvedBadgeText}>Resolvido</Text>
                    </View>
                  ) : (
                    <View style={s.activeBadge}>
                      <View style={s.activeDot} />
                      <Text style={s.activeBadgeText}>Ativo</Text>
                    </View>
                  )}
                </View>

                {/* Content */}
                <Text style={s.cardContent} numberOfLines={3}>{help.content}</Text>

                {/* Footer */}
                <View style={s.cardFooter}>
                  <Image
                    source={{ uri: author.photos?.[0] ?? DEFAULT_AVATAR }}
                    style={s.authorAvatar}
                  />
                  <Text style={s.authorName} numberOfLines={1}>{author.name ?? 'Viajante'}</Text>
                  <View style={s.dot} />
                  <MapPin size={11} color={MUTED} />
                  <Text style={s.authorCity} numberOfLines={1}>{help.city}</Text>
                </View>

                {/* Resolve CTA (only if not resolved) */}
                {!isResolved && currentUserId === help.user_id && (
                  <TouchableOpacity
                    style={s.resolveBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      resolveHelp({ requestId: help.id, status: 'resolved' });
                    }}
                    disabled={isResolving}
                    activeOpacity={0.8}
                  >
                    <Check size={13} color={GREEN} />
                    <Text style={s.resolveBtnText}>Marcar como resolvido</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <MessageSquare size={28} color={PRIMARY} />
            </View>
            <Text style={s.emptyTitle}>Nenhuma solicitação</Text>
            <Text style={s.emptySub}>Seja o primeiro a pedir ajuda por aqui!</Text>
            <TouchableOpacity
              style={s.emptyAction}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setModalVisible(true);
              }}
            >
              <Plus size={14} color={PRIMARY} />
              <Text style={s.emptyActionText}>Pedir ajuda</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ─── Create Modal ─────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Pedir Ajuda</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Categoria</Text>
            <View style={s.catSelector}>
              {CATEGORIES.map(cat => {
                const cc  = catConf(cat);
                const sel = newCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.catOption, sel && { backgroundColor: cc.bg, borderColor: cc.color }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewCategory(cat);
                    }}
                    activeOpacity={0.8}
                  >
                    {cc.icon(13, sel ? cc.color : MUTED)}
                    <Text style={[s.catOptionText, sel && { color: cc.color, fontWeight: '700' }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.inputLabel}>Sua pergunta</Text>
            <TextInput
              style={s.textInput}
              multiline
              numberOfLines={4}
              placeholder="Ex: Onde tem farmácia aberta de madrugada por aqui?"
              placeholderTextColor={MUTED}
              value={newContent}
              onChangeText={setNewContent}
            />

            <TouchableOpacity
              style={[s.submitBtn, (!newContent.trim() || isCreating) && { opacity: 0.45 }]}
              onPress={handleCreate}
              disabled={!newContent.trim() || isCreating}
              activeOpacity={0.85}
            >
              {isCreating
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.submitBtnText}>Publicar Pedido</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Details Modal ────────────────────────────────────────────── */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={[s.modalSheet, { height: '90%', paddingBottom: 0 }]}>
            <View style={s.modalHandle} />

            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Detalhes do Pedido</Text>
              <TouchableOpacity
                onPress={() => { setDetailsModalVisible(false); setSelectedRequest(null); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Author */}
                <View style={s.detailAuthorRow}>
                  <Image
                    source={{ uri: selectedRequest.users?.photos?.[0] ?? DEFAULT_AVATAR }}
                    style={s.detailAvatar}
                  />
                  <View>
                    <Text style={s.detailAuthorName}>{selectedRequest.users?.name ?? 'Viajante'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <MapPin size={11} color={MUTED} />
                      <Text style={s.detailAuthorCity}>{selectedRequest.city}</Text>
                    </View>
                  </View>
                </View>

                {/* Content */}
                <Text style={s.detailContent}>{selectedRequest.content}</Text>

                {/* Owner actions */}
                {currentUserId === selectedRequest.user_id && (
                  <View style={s.ownerActions}>
                    {!selectedRequest.status?.includes('resolved') && (
                      <TouchableOpacity
                        style={s.ownerResolveBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          resolveHelp({ requestId: selectedRequest.id, status: 'resolved' }, {
                            onSuccess: () => setDetailsModalVisible(false),
                          });
                        }}
                        activeOpacity={0.85}
                      >
                        <Check size={14} color={GREEN} />
                        <Text style={s.ownerResolveBtnText}>Resolver</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={s.ownerDeleteBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert('Excluir Pedido', 'Tem certeza que deseja excluir?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Excluir', style: 'destructive', onPress: () => {
                            deleteHelp(selectedRequest.id, { onSuccess: () => setDetailsModalVisible(false) });
                          }},
                        ]);
                      }}
                      activeOpacity={0.85}
                    >
                      <Trash2 size={14} color={RED} />
                      <Text style={s.ownerDeleteBtnText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={s.divider} />
                <Text style={s.repliesTitle}>Respostas</Text>

                {isLoadingReplies ? (
                  <ActivityIndicator color={PRIMARY} style={{ marginTop: 16 }} />
                ) : replies && replies.length > 0 ? (
                  replies.map((reply: any) => (
                    <View key={reply.id} style={s.replyCard}>
                      <View style={s.replyAuthorRow}>
                        <Image
                          source={{ uri: reply.users?.photos?.[0] ?? DEFAULT_AVATAR }}
                          style={s.replyAvatar}
                        />
                        <Text style={s.replyAuthorName}>{reply.users?.name ?? 'Viajante'}</Text>
                      </View>
                      <Text style={s.replyContent}>{reply.content}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={s.noRepliesText}>Nenhuma resposta ainda. Seja o primeiro a ajudar!</Text>
                )}
              </ScrollView>
            )}

            {/* Reply input */}
            <View style={s.replyInputBar}>
              <TextInput
                style={s.replyInput}
                placeholder="Escreva uma resposta..."
                placeholderTextColor={MUTED}
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity
                style={[s.replySendBtn, (!replyText.trim() || isReplying) && { opacity: 0.4 }]}
                onPress={() => {
                  if (!replyText.trim()) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  createReply({ requestId: selectedRequest.id, content: replyText }, {
                    onSuccess: () => setReplyText(''),
                  });
                }}
                disabled={!replyText.trim() || isReplying}
                activeOpacity={0.85}
              >
                {isReplying
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Send size={16} color="#FFF" style={{ marginLeft: 1 }} />}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => {
  const BG          = isDark ? '#0A0A0C' : colors.background;
  const CARD        = isDark ? '#141416' : colors.card;
  const SHEET       = isDark ? '#111114' : colors.card;
  const BORDER      = isDark ? '#222226' : colors.border;
  const MUTED       = isDark ? '#A1A1AA' : colors.textSecondary;
  const TEXT        = isDark ? '#FFFFFF' : colors.textPrimary;
  const PRIMARY     = '#6338FA';
  const PRIMARY_DIM = isDark ? 'rgba(99,56,250,0.15)' : 'rgba(99,56,250,0.08)';
  const PRIMARY_BDR = isDark ? 'rgba(99,56,250,0.3)' : 'rgba(99,56,250,0.2)';
  const GREEN       = '#22C55E';
  const GREEN_DIM   = 'rgba(34,197,94,0.12)';
  const RED         = '#EF4444';
  const RED_DIM     = 'rgba(239,68,68,0.1)';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },

  standaloneHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
    fontWeight: '500',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: PRIMARY_DIM,
    borderWidth: 1,
    borderColor: PRIMARY_BDR,
    marginHorizontal: 18,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#C4B5FD',
    lineHeight: 18,
    fontWeight: '500',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  filterPillTextActive: {
    color: '#FFF',
  },

  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  cardResolved: {
    borderColor: 'rgba(34,197,94,0.25)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GREEN_DIM,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  resolvedBadgeText: {
    fontSize: 11,
    color: GREEN,
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PRIMARY_DIM,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PRIMARY,
  },
  activeBadgeText: {
    fontSize: 11,
    color: '#C4B5FD',
    fontWeight: '700',
  },
  cardContent: {
    fontSize: 14.5,
    fontWeight: '600',
    color: isDark ? '#E4E4E7' : colors.textPrimary,
    lineHeight: 21,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  authorName: {
    fontSize: 12,
    color: TEXT,
    fontWeight: '600',
    flexShrink: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: MUTED,
    marginHorizontal: 2,
  },
  authorCity: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '500',
    flexShrink: 1,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GREEN_DIM,
    borderRadius: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  resolveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY_DIM,
    borderWidth: 1,
    borderColor: PRIMARY_BDR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: PRIMARY_DIM,
    borderWidth: 1,
    borderColor: PRIMARY_BDR,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.3,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 10,
  },

  // Category selector in modal
  catSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: isDark ? CARD : colors.surface,
    borderWidth: 1,
    borderColor: BORDER,
  },
  catOptionText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },

  textInput: {
    backgroundColor: isDark ? CARD : colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    fontSize: 14,
    color: TEXT,
    textAlignVertical: 'top',
    height: 110,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.1,
  },

  // Details modal content
  detailAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  detailAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  detailAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  },
  detailAuthorCity: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '500',
  },
  detailContent: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
    lineHeight: 24,
    marginBottom: 16,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  ownerResolveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GREEN_DIM,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  ownerResolveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  ownerDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: RED_DIM,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  ownerDeleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: RED,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },
  repliesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 12,
  },
  replyCard: {
    backgroundColor: isDark ? CARD : colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  replyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  replyAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  replyContent: {
    fontSize: 13.5,
    color: isDark ? '#E4E4E7' : colors.textPrimary,
    lineHeight: 19,
  },
  noRepliesText: {
    fontSize: 13,
    color: MUTED,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  replyInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  replyInput: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 42,
    fontSize: 14,
    color: TEXT,
  },
  replySendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  });
};
