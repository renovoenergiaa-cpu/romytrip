import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Settings,
  MapPin,
  Pencil,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Briefcase,
  Star,
  MessageCircle,
  User,
  Handshake,
  Globe,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Image as ImageIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/lib/supabase';
import { spacing, useTheme } from '../../src/theme';
import { SkeletonProfileHeader, SkeletonLine } from '../../src/components/SkeletonLoader';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const defaultAvatar =
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
  const avatarUrl = profile?.photos?.[0] || defaultAvatar;

  const name = String(profile?.name || 'Thadeu');
  const city = String(profile?.city ? `${profile.city}, Brasil` : 'Cabo Frio, Rio de Janeiro, Brasil');
  const bio = String(profile?.bio || 'Boraaa');
  const objective = String(
    profile?.connection_intentions?.[0] ||
    profile?.connection_objective ||
    'Conhecer pessoas para explorar a cidade, tomar café, fazer trilhas e trocar experiências.'
  );
  const destination = String(profile?.destination || 'Em casa');

  const rawInterests =
    Array.isArray(profile?.travel_styles) && profile.travel_styles.length > 0
      ? profile.travel_styles
      : Array.isArray(profile?.common_interests) && profile.common_interests.length > 0
      ? profile.common_interests
      : ['Café', 'Trilhas', 'Praia', 'Fotografia', 'Música'];

  const interests = rawInterests
    .map((item: any) => (typeof item === 'string' ? item : item?.label || item?.name || ''))
    .filter((s: string) => s.length > 0);

  const rawLanguages =
    Array.isArray(profile?.interests) && profile.interests.length > 0
      ? profile.interests
      : Array.isArray(profile?.languages) && profile.languages.length > 0
      ? profile.languages
      : ['Português', 'Inglês'];

  const languages = rawLanguages
    .map((item: any) => (typeof item === 'string' ? item : item?.label || item?.name || ''))
    .filter((s: string) => s.length > 0);

  const availability = String(profile?.companions || profile?.availability || 'Fins de semana e noites durante a semana.');

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#09090B' : '#F8F9FA' }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meu perfil</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={{ padding: spacing.xl }}>
          <SkeletonProfileHeader />
          <SkeletonLine width="90%" height={14} style={{ marginBottom: 10 }} />
          <SkeletonLine width="70%" height={14} style={{ marginBottom: 24 }} />
          <SkeletonLine width="100%" height={72} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLine width="50%" height={16} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[80, 110, 90].map((w, i) => (
              <SkeletonLine key={i} width={w} height={32} borderRadius={20} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#09090B' : '#F8F9FA' }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/dev-seed');
          }}
        >
          <Text style={styles.headerTitle}>Meu perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/settings');
          }}
          style={styles.settingsBtn}
          accessibilityLabel="Configurações"
          accessibilityRole="button"
        >
          <Settings size={22} color={isDark ? '#FFFFFF' : '#111827'} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Identity Surface Card */}
        <View style={styles.identityCard}>
          {/* Avatar + Info Column */}
          <View style={styles.identityRow}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              <View style={styles.avatarStatusBadge}>
                <View style={styles.avatarStatusDot} />
              </View>
            </View>
            <View style={styles.identityTextCol}>
              <Text style={styles.userName}>{name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={13} color={isDark ? '#A1A1AA' : '#6B7280'} strokeWidth={2} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {city}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.editProfileBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/edit-profile');
                }}
              >
                <Pencil size={12} color={isDark ? '#E4E4E7' : '#18181B'} strokeWidth={2.2} />
                <Text style={styles.editProfileBtnText}>Editar perfil</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bio text */}
          <Text style={styles.bioText}>{bio}</Text>

          {/* Upgrade Banner: "Torne-se Premium ou Gold" */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(modals)/paywall');
            }}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['#261D10', '#1C150A']
                  : ['#FFFDF7', '#FEF9EE']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumBanner}
            >
              <View style={styles.premiumIconCircle}>
                <Sparkles size={18} color="#FFFFFF" />
              </View>
              <View style={styles.premiumTextCol}>
                <Text style={styles.premiumTitle}>Torne-se Premium ou Gold</Text>
                <Text style={styles.premiumSubtitle}>
                  Desbloqueie tradução com IA e recursos exclusivos.
                </Text>
              </View>
              <ChevronRight size={18} color="#D97706" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Trust Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.trustedBadge}>
              <ShieldCheck size={13} color="#2563EB" strokeWidth={2.2} />
              <Text style={styles.trustedBadgeText}>Trusted Traveler</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <CheckCircle size={13} color="#16A34A" strokeWidth={2.2} />
              <Text style={styles.verifiedBadgeText}>Viajante Verificado</Text>
            </View>
          </View>
        </View>

        {/* 2. Stats Row Card (Startup KPI Block) */}
        <View style={styles.statsCard}>
          {/* Stat 1: Viagens */}
          <View style={styles.statCol}>
            <Briefcase size={18} color="#8B5CF6" strokeWidth={2.2} />
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Viagens</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Stat 2: Avaliação */}
          <View style={styles.statCol}>
            <Star size={18} color="#8B5CF6" strokeWidth={2.2} />
            <Text style={styles.statValue}>5.0</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Stat 3: Reviews */}
          <View style={styles.statCol}>
            <MessageCircle size={18} color="#8B5CF6" strokeWidth={2.2} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* 3. The 6 Information Cards */}
        <View style={styles.infoCardsSection}>
          {/* Card 1: Sobre */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.infoCard}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/edit-profile');
            }}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? '#27272A' : '#F5EFEB' }]}>
              <User size={18} color={isDark ? '#E4E4E7' : '#4B5563'} strokeWidth={2.2} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Sobre</Text>
              <Text style={styles.infoCardSubtitle}>{bio}</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* Card 2: Objetivo da conexão */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.infoCard}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/edit-profile');
            }}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#E6F4EA' }]}>
              <Handshake size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Objetivo da conexão</Text>
              <Text style={styles.infoCardSubtitle}>{objective}</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* Card 3: Viagem atual */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.infoCard}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/create');
            }}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#E6F7F5' }]}>
              <Briefcase size={18} color="#0D9488" strokeWidth={2.2} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Viagem atual</Text>
              <Text style={styles.infoCardSubtitle}>{`Destino: ${destination}`}</Text>
            </View>
            <View style={styles.activePillBadge}>
              <View style={styles.activePillDot} />
              <Text style={styles.activePillBadgeText}>Ativo</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* Card 4: Interesses em comum */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.infoCard}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/edit-profile');
            }}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Interesses em comum</Text>
              <View style={styles.miniChipsRow}>
                {interests.map((item: string, idx: number) => (
                  <View key={idx} style={styles.miniChip}>
                    <Text style={styles.miniChipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
            <ChevronRight size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* Card 5: Idiomas */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.infoCard}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/edit-profile');
            }}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#F3E8FF' }]}>
              <Globe size={18} color="#8B5CF6" strokeWidth={2.2} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Idiomas</Text>
              <View style={styles.miniChipsRow}>
                {languages.map((lang: string, idx: number) => (
                  <View key={idx} style={styles.miniChip}>
                    <Text style={styles.miniChipText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
            <ChevronRight size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </TouchableOpacity>

          {/* Card 6: Disponibilidade */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.infoCard}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/edit-profile');
            }}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#E6F7F5' }]}>
              <Calendar size={18} color="#0D9488" strokeWidth={2.2} />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Disponibilidade</Text>
              <Text style={styles.infoCardSubtitle}>{availability}</Text>
            </View>
            <ChevronRight size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>

        {/* 4. Momentos de viagem Section */}
        <View style={styles.momentosSection}>
          <View style={styles.momentosHeaderRow}>
            <Text style={styles.momentosSectionTitle}>Momentos de viagem</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.novoMomentoBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/create');
              }}
            >
              <Plus size={13} color="#6338FA" strokeWidth={2.6} />
              <Text style={styles.novoMomentoBtnText}>Novo</Text>
            </TouchableOpacity>
          </View>

          {/* Moment Card */}
          <View style={styles.momentoCard}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
              }}
              style={styles.momentoThumbnail}
            />
            <View style={styles.momentoMetaCol}>
              <Text style={styles.momentoTitle}>Primeira Viagem</Text>
              <View style={styles.momentoLocationRow}>
                <MapPin size={12} color={isDark ? '#A1A1AA' : '#6B7280'} strokeWidth={2} />
                <Text style={styles.momentoLocationText}>Paris, França</Text>
              </View>
              <View style={styles.momentoPhotoCountRow}>
                <ImageIcon size={12} color={isDark ? '#A1A1AA' : '#6B7280'} strokeWidth={2} />
                <Text style={styles.momentoPhotoCountText}>1 foto</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.momentoMoreBtn}
              onPress={() => Haptics.selectionAsync()}
            >
              <MoreHorizontal size={18} color={isDark ? '#A1A1AA' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 12,
      paddingBottom: 10,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#111827',
      letterSpacing: -0.5,
    },
    settingsBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    headerSpacer: {
      width: 24,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 110,
      gap: 12,
    },

    // ─── Identity Surface Card ───────────────────────────────────────────────
    identityCard: {
      backgroundColor: isDark ? '#141416' : '#FFFFFF',
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? '#222226' : '#ECEEF1',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.035,
      shadowRadius: 8,
      elevation: 2,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatarImage: {
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: isDark ? '#27272A' : '#E5E7EB',
      borderWidth: 2,
      borderColor: isDark ? '#27272A' : '#FFFFFF',
    },
    avatarStatusBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: isDark ? '#141416' : '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarStatusDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: '#10B981',
    },
    identityTextCol: {
      flex: 1,
      justifyContent: 'center',
    },
    userName: {
      fontSize: 21,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#111827',
      letterSpacing: -0.4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      marginBottom: 8,
    },
    locationText: {
      fontSize: 12,
      color: isDark ? '#A1A1AA' : '#6B7280',
      fontWeight: '400',
    },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: isDark ? '#333338' : '#E5E7EB',
      backgroundColor: isDark ? '#1C1C20' : '#FAFAFA',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    editProfileBtnText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#18181B',
    },
    bioText: {
      fontSize: 13.5,
      color: isDark ? '#D4D4D8' : '#374151',
      marginTop: 12,
      lineHeight: 19,
    },

    // ─── Upgrade Banner ──────────────────────────────────────────────────────
    premiumBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#78350F' : '#FDE68A',
      borderRadius: 16,
      padding: 12,
      marginTop: 12,
      gap: 12,
    },
    premiumIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#F59E0B',
      justifyContent: 'center',
      alignItems: 'center',
    },
    premiumTextCol: {
      flex: 1,
    },
    premiumTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#D97706',
    },
    premiumSubtitle: {
      fontSize: 11,
      color: isDark ? '#D1D5DB' : '#78716C',
      marginTop: 2,
      lineHeight: 15,
    },

    // ─── Trust Badges ────────────────────────────────────────────────────────
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    trustedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#BFDBFE',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
    },
    trustedBadgeText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: isDark ? '#60A5FA' : '#2563EB',
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : '#BBF7D0',
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#F0FDF4',
    },
    verifiedBadgeText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: isDark ? '#4ADE80' : '#16A34A',
    },

    // ─── Stats Card ──────────────────────────────────────────────────────────
    statsCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#141416' : '#FFFFFF',
      borderRadius: 20,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: isDark ? '#222226' : '#ECEEF1',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.035,
      shadowRadius: 8,
      elevation: 2,
      alignItems: 'center',
    },
    statCol: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontSize: 19,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#111827',
      letterSpacing: -0.4,
      marginTop: 2,
    },
    statLabel: {
      fontSize: 11.5,
      color: isDark ? '#A1A1AA' : '#6B7280',
      fontWeight: '500',
    },
    statDivider: {
      width: 1,
      height: 36,
      backgroundColor: isDark ? '#27272A' : '#F1F3F5',
    },

    // ─── The 6 Information Cards ─────────────────────────────────────────────
    infoCardsSection: {
      gap: 9,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#141416' : '#FFFFFF',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: isDark ? '#222226' : '#ECEEF1',
      gap: 12,
    },
    infoIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoCardContent: {
      flex: 1,
    },
    infoCardTitle: {
      fontSize: 13.5,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#111827',
      marginBottom: 2,
    },
    infoCardSubtitle: {
      fontSize: 11.5,
      color: isDark ? '#A1A1AA' : '#6B7280',
      lineHeight: 16.5,
    },
    activePillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      marginRight: 2,
    },
    activePillDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#16A34A',
    },
    activePillBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    miniChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
      marginTop: 4,
    },
    miniChip: {
      backgroundColor: isDark ? '#222226' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    miniChipText: {
      fontSize: 11,
      color: isDark ? '#E4E4E7' : '#374151',
      fontWeight: '500',
    },

    // ─── Momentos de Viagem Section ──────────────────────────────────────────
    momentosSection: {
      marginTop: 4,
    },
    momentosHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    momentosSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#111827',
      letterSpacing: -0.2,
    },
    novoMomentoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 11,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(99, 56, 250, 0.18)' : '#F3F0FF',
    },
    novoMomentoBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#6338FA',
    },
    momentoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#141416' : '#FFFFFF',
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? '#222226' : '#ECEEF1',
      gap: 12,
    },
    momentoThumbnail: {
      width: 102,
      height: 70,
      borderRadius: 13,
      backgroundColor: isDark ? '#27272A' : '#E5E7EB',
    },
    momentoMetaCol: {
      flex: 1,
      justifyContent: 'center',
      gap: 3,
    },
    momentoTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#111827',
    },
    momentoLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    momentoLocationText: {
      fontSize: 11.5,
      color: isDark ? '#A1A1AA' : '#6B7280',
    },
    momentoPhotoCountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    momentoPhotoCountText: {
      fontSize: 11,
      color: isDark ? '#A1A1AA' : '#6B7280',
    },
    momentoMoreBtn: {
      padding: 6,
    },
  });
