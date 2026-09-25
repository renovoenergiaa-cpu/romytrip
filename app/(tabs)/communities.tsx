import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Search,
  Plus,
  Clock,
  MapPin,
  Calendar,
  Users,
  CalendarDays,
  DollarSign,
  Lock,
  Trash2,
  Edit3,
  Globe,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, useTheme } from '../../src/theme';
import { useMyEvents, useDeleteEvent } from '../../src/hooks/useEvents';
import { useCommunities, useMyCommunities } from '../../src/hooks/useCommunities';
import EditEventModal from '../../src/components/EditEventModal';
import CreateCommunityModal from '../../src/components/CreateCommunityModal';
import { AVAILABLE_EVENT_ICONS } from '../../src/components/CreateEventModal';

// ─── Design tokens (same as profile) ────────────────────────────────────────
const BG       = '#0A0A0C';
const CARD     = '#141416';
const BORDER   = '#222226';
const MUTED    = '#A1A1AA';
const PRIMARY  = '#6338FA';
const PRIMARY_DIM = 'rgba(99,56,250,0.15)';

// ─── Type badge colours ──────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { text: string; bg: string; icon: string }> = {
  'Temporária':    { text: '#C084FC', bg: 'rgba(192,132,252,0.12)', icon: '#C084FC' },
  'Internacional': { text: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  icon: '#60A5FA' },
  'Privada':       { text: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  icon: '#FBBF24' },
  default:         { text: '#34D399', bg: 'rgba(52,211,153,0.12)',  icon: '#34D399' },
};

function typeColors(type?: string) {
  return TYPE_COLORS[type ?? ''] ?? TYPE_COLORS.default;
}

function typeIcon(type?: string, size = 13, col = '#34D399') {
  switch (type) {
    case 'Temporária':    return <Clock    size={size} color={col} />;
    case 'Internacional': return <Globe    size={size} color={col} />;
    case 'Privada':       return <Lock     size={size} color={col} />;
    default:              return <Users    size={size} color={col} />;
  }
}

// ─── Community Card ──────────────────────────────────────────────────────────
function CommunityCard({ comm, onPress }: { comm: any; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const s = getStyles(colors, isDark);
  const MUTED = isDark ? '#A1A1AA' : colors.textSecondary;
  const tc = typeColors(comm.type);
  const members = comm.community_members?.[0]?.count ?? 1;
  const posts   = comm.community_posts?.[0]?.count   ?? 0;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.78}>
      {/* Type badge row */}
      <View style={[s.cardTypeBadge, { backgroundColor: tc.bg }]}>
        {typeIcon(comm.type, 12, tc.icon)}
        <Text style={[s.cardTypeBadgeText, { color: tc.text }]}>{comm.type ?? 'Comunidade'}</Text>
      </View>

      <Text style={s.cardTitle} numberOfLines={2}>{comm.title}</Text>

      {comm.description ? (
        <Text style={s.cardDesc} numberOfLines={2}>{comm.description}</Text>
      ) : null}

      {comm.location ? (
        <View style={s.cardMeta}>
          <MapPin size={11} color={MUTED} />
          <Text style={s.cardMetaText}>{comm.location}</Text>
        </View>
      ) : null}

      <View style={s.cardFooter}>
        <View style={s.cardStat}>
          <Users size={12} color={MUTED} />
          <Text style={s.cardStatText}>{members} membros</Text>
        </View>
        <View style={s.cardStat}>
          <CalendarDays size={12} color={MUTED} />
          <Text style={s.cardStatText}>{posts} posts</Text>
        </View>
        <ChevronRight size={14} color={MUTED} style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function CommunitiesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const s = getStyles(colors, isDark);
  const MUTED = isDark ? '#A1A1AA' : colors.textSecondary;
  const [activeTab, setActiveTab]         = useState<'minhas' | 'descobrir' | 'eventos'>('minhas');
  const [editingEvent, setEditingEvent]   = useState<any>(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const { data: myEvents,      isLoading: isLoadingEvents } = useMyEvents();
  const { mutate: deleteEvent }                              = useDeleteEvent();
  const { data: myCommunities, isLoading: isLoadingMy  }   = useMyCommunities();
  const { data: allCommunities,isLoading: isLoadingAll }   = useCommunities();

  const handleDeleteEvent = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Excluir Evento', 'Tem certeza que deseja excluir este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir',  style: 'destructive', onPress: () => deleteEvent({ eventId }) },
    ]);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const filteredMy  = (myCommunities  ?? []).filter((c: any) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAll = (allCommunities ?? []).filter((c: any) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const TABS: { key: 'minhas' | 'descobrir' | 'eventos'; label: string }[] = [
    { key: 'minhas',    label: 'Minhas'   },
    { key: 'descobrir', label: 'Descobrir'},
    { key: 'eventos',   label: 'Eventos'  },
  ];

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Comunidades</Text>
            <Text style={s.headerSub}>Encontre sua turma de viagem</Text>
          </View>
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setCreateModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ─── Search ─────────────────────────────────────────────────────── */}
        <View style={s.searchBox}>
          <Search size={16} color={MUTED} />
          <TextInput
            placeholder="Buscar comunidades..."
            placeholderTextColor={MUTED}
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* ─── Tabs ───────────────────────────────────────────────────────── */}
        <View style={s.tabsRow}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabPill, activeTab === t.key && s.tabPillActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(t.key);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.tabPillText, activeTab === t.key && s.tabPillTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Minhas ─────────────────────────────────────────────────────── */}
        {activeTab === 'minhas' && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Minhas Comunidades</Text>
            </View>

            {isLoadingMy ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
            ) : filteredMy.length > 0 ? (
              filteredMy.map((comm: any) => (
                <CommunityCard
                  key={comm.id}
                  comm={comm}
                  onPress={() => router.push(`/community/${comm.id}`)}
                />
              ))
            ) : (
              <View style={s.empty}>
                <View style={s.emptyIconWrap}>
                  <Users size={28} color={PRIMARY} />
                </View>
                <Text style={s.emptyTitle}>Nenhuma comunidade ainda</Text>
                <Text style={s.emptySub}>
                  Crie ou entre em uma comunidade para se conectar com outros viajantes.
                </Text>
                <TouchableOpacity
                  style={s.emptyAction}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setCreateModalVisible(true);
                  }}
                >
                  <Plus size={14} color={PRIMARY} />
                  <Text style={s.emptyActionText}>Criar comunidade</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ─── Descobrir ──────────────────────────────────────────────────── */}
        {activeTab === 'descobrir' && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Descobrir</Text>
            </View>

            {isLoadingAll ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
            ) : filteredAll.length > 0 ? (
              filteredAll.map((comm: any) => (
                <CommunityCard
                  key={comm.id}
                  comm={comm}
                  onPress={() => router.push(`/community/${comm.id}`)}
                />
              ))
            ) : (
              <View style={s.empty}>
                <View style={s.emptyIconWrap}>
                  <Globe size={28} color={PRIMARY} />
                </View>
                <Text style={s.emptyTitle}>Nenhuma comunidade pública</Text>
                <Text style={s.emptySub}>
                  Volte mais tarde ou seja o primeiro a criar uma!
                </Text>
              </View>
            )}
          </>
        )}

        {/* ─── Eventos ────────────────────────────────────────────────────── */}
        {activeTab === 'eventos' && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Meus Eventos</Text>
            </View>

            {isLoadingEvents ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
            ) : myEvents && myEvents.length > 0 ? (
              myEvents.map(event => {
                const iconObj = AVAILABLE_EVENT_ICONS.find(i => i.id === event.icon);
                const IconComp = iconObj?.component;

                return (
                  <View key={event.id} style={s.eventCard}>
                    {/* Icon + title row */}
                    <View style={s.eventCardTop}>
                      <View style={s.eventIconCircle}>
                        {IconComp ? (
                          <IconComp size={22} color={PRIMARY} />
                        ) : (
                          <Text style={{ fontSize: 22 }}>{event.icon}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.eventTitle} numberOfLines={1}>{event.title}</Text>
                        <View style={s.eventMetaRow}>
                          <MapPin size={11} color={MUTED} />
                          <Text style={s.eventMetaText} numberOfLines={1}>
                            {event.location_name}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Date/time pills */}
                    <View style={s.eventPillsRow}>
                      <View style={s.eventPill}>
                        <Calendar size={11} color={PRIMARY} />
                        <Text style={s.eventPillText}>{formatDate(event.start_time)}</Text>
                      </View>
                      <View style={s.eventPill}>
                        <Clock size={11} color={PRIMARY} />
                        <Text style={s.eventPillText}>
                          {formatTime(event.start_time)} – {formatTime(event.end_time)}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={s.eventActions}>
                      <TouchableOpacity
                        style={s.eventActionEdit}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditingEvent(event);
                        }}
                        activeOpacity={0.8}
                      >
                        <Edit3 size={14} color={PRIMARY} />
                        <Text style={s.eventActionEditText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.eventActionDelete}
                        onPress={() => handleDeleteEvent(event.id)}
                        activeOpacity={0.8}
                      >
                        <Trash2 size={14} color="#EF4444" />
                        <Text style={s.eventActionDeleteText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={s.empty}>
                <View style={s.emptyIconWrap}>
                  <CalendarDays size={28} color={PRIMARY} />
                </View>
                <Text style={s.emptyTitle}>Nenhum evento criado</Text>
                <Text style={s.emptySub}>
                  Crie eventos no mapa para reunir viajantes em um local.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <EditEventModal
        visible={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
      />

      <CreateCommunityModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) => {
  const BG       = isDark ? '#0A0A0C' : colors.background;
  const CARD     = isDark ? '#141416' : colors.card;
  const BORDER   = isDark ? '#222226' : colors.border;
  const MUTED    = isDark ? '#A1A1AA' : colors.textSecondary;
  const TEXT     = isDark ? '#FFFFFF' : colors.textPrimary;
  const PRIMARY  = '#6338FA';
  const PRIMARY_DIM = isDark ? 'rgba(99,56,250,0.15)' : 'rgba(99,56,250,0.08)';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: BG,
    },
    scroll: {
      paddingHorizontal: 18,
      paddingBottom: 100,
    },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 14 : 10,
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: TEXT,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontSize: 13,
      color: MUTED,
      marginTop: 1,
      fontWeight: '500',
    },
    createBtn: {
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

    // Search
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? CARD : colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 14,
      height: 46,
      marginBottom: 18,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: TEXT,
      fontWeight: '500',
    },

    // Tabs
    tabsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 22,
    },
    tabPill: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 24,
      backgroundColor: isDark ? CARD : colors.surface,
      borderWidth: 1,
      borderColor: BORDER,
    },
    tabPillActive: {
      backgroundColor: PRIMARY,
      borderColor: PRIMARY,
    },
    tabPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: MUTED,
    },
    tabPillTextActive: {
      color: '#FFFFFF',
    },

    // Section header
    sectionHeader: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: TEXT,
      letterSpacing: -0.2,
    },

    // Community card
    card: {
      backgroundColor: CARD,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: BORDER,
      padding: 16,
      marginBottom: 12,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.18 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    cardTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 10,
    },
    cardTypeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: TEXT,
      letterSpacing: -0.2,
    },
    cardDesc: {
      fontSize: 13,
      color: MUTED,
      lineHeight: 18,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardMetaText: {
      fontSize: 12,
      color: MUTED,
      fontWeight: '500',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 4,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },
    cardStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardStatText: {
      fontSize: 12,
      color: MUTED,
      fontWeight: '500',
    },

    // Event card
    eventCard: {
      backgroundColor: CARD,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: BORDER,
      padding: 16,
      marginBottom: 12,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.18 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    eventCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    eventIconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: PRIMARY_DIM,
      borderWidth: 1,
      borderColor: 'rgba(99,56,250,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: TEXT,
      marginBottom: 3,
    },
    eventMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    eventMetaText: {
      fontSize: 12,
      color: MUTED,
      fontWeight: '500',
    },
    eventPillsRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    eventPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: PRIMARY_DIM,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(99,56,250,0.2)',
    },
    eventPillText: {
      fontSize: 12,
      color: isDark ? '#C4B5FD' : colors.primary,
      fontWeight: '600',
    },
    eventActions: {
      flexDirection: 'row',
      gap: 10,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },
    eventActionEdit: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: PRIMARY_DIM,
      borderRadius: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: 'rgba(99,56,250,0.25)',
    },
    eventActionEditText: {
      fontSize: 13,
      fontWeight: '700',
      color: PRIMARY,
    },
    eventActionDelete: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2',
      borderRadius: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#FECACA',
    },
    eventActionDeleteText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#EF4444',
    },

    // Empty state
    empty: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: PRIMARY_DIM,
      borderWidth: 1,
      borderColor: 'rgba(99,56,250,0.25)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: TEXT,
      marginBottom: 6,
      letterSpacing: -0.2,
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
      borderColor: 'rgba(99,56,250,0.3)',
    },
    emptyActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: PRIMARY,
    },
  });
};
