import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  Check,
  Briefcase,
  Coffee,
  User,
  Handshake,
  Home,
  Star,
  Globe,
  Calendar,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface TravelerProfileCardProps {
  traveler: any;
  scrollEnabled?: boolean;
  imageAnimatedStyle?: any;
  overlayElement?: React.ReactNode;
  colors: any;
  isDark: boolean;
}

export const TravelerProfileCard = React.memo(function TravelerProfileCard({
  traveler,
  scrollEnabled = true,
  imageAnimatedStyle,
  overlayElement,
  colors,
  isDark,
}: TravelerProfileCardProps) {
  if (!traveler) return null;

  const rawAge = traveler.dob
    ? new Date().getFullYear() - new Date(traveler.dob).getFullYear()
    : (traveler.age || 29);
  const age = isNaN(rawAge) ? 29 : rawAge;

  const name = String(traveler.name || 'Thadeu Zan');
  const city = String(traveler.city || 'Cabo Frio, RJ');
  const bio = String(
    traveler.bio ||
    'Gosto de viajar solo e conhecer pessoas para explorar cafés, trilhas e a cidade.'
  );
  const objective = String(
    traveler.connection_objective ||
    traveler.connection_intentions?.[0] ||
    'Conhecer pessoas para viajar e explorar a cidade.'
  );
  const destination = String(traveler.destination || 'Em casa');
  const workStatus = String(traveler.work_status || 'Trabalho remoto');
  const coffeePref = String(traveler.coffee_preference || 'Gosta de café');

  const rawInterests = Array.isArray(traveler.common_interests) && traveler.common_interests.length > 0
    ? traveler.common_interests
    : Array.isArray(traveler.travel_styles) && traveler.travel_styles.length > 0
    ? traveler.travel_styles
    : ['Café', 'Trilhas', 'Praia', 'Fotografia', 'Música'];

  const interests = rawInterests
    .map((item: any) => (typeof item === 'string' ? item : item?.label || item?.name || ''))
    .filter((s: string) => s.length > 0);

  const rawLanguages = Array.isArray(traveler.languages) && traveler.languages.length > 0
    ? traveler.languages
    : ['Português', 'Inglês'];

  const languages = rawLanguages
    .map((item: any) => (typeof item === 'string' ? item : item?.label || item?.name || ''))
    .filter((s: string) => s.length > 0);

  const availability = String(traveler.availability || 'Fins de semana e noites');

  const photoUri = String(
    traveler.photos?.[0] ||
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
  );

  return (
    <View style={[styles.screenContainer, { backgroundColor: isDark ? '#0A0A0A' : '#F8F9FA' }]}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO PROFILE PHOTO CARD */}
        <View style={styles.heroCard}>
          <Animated.Image
            source={{ uri: photoUri }}
            style={[styles.heroImage, imageAnimatedStyle]}
          />

          {/* Top Controls on Photo */}
          <View style={styles.heroTopBar}>
            {/* Online Status Pill */}
            <View style={styles.onlinePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>

            {/* Three Dots More Menu */}
            <TouchableOpacity activeOpacity={0.7} style={styles.moreButton}>
              <MoreHorizontal size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Bottom Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
            locations={[0, 0.45, 1]}
            style={styles.heroBottomGradient}
          >
            {/* Name, Age and Verified Badge */}
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{`${name}, ${age}`}</Text>
              <View style={styles.verifiedBadge}>
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>

            {/* Location Row */}
            <View style={styles.locationRow}>
              <MapPin size={14} color="#FFFFFF" />
              <Text style={styles.locationText}>{city}</Text>
            </View>

            {/* Highlight Metadata Pills */}
            <View style={styles.metaPillsRow}>
              <View style={styles.metaPill}>
                <Briefcase size={12} color="#FFFFFF" />
                <Text style={styles.metaPillText}>{workStatus}</Text>
              </View>

              <View style={styles.metaPill}>
                <Coffee size={12} color="#FFFFFF" />
                <Text style={styles.metaPillText}>{coffeePref}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Dynamic Reject / Connect color overlay */}
          {overlayElement ? overlayElement : null}
        </View>

        {/* INFO CARDS SECTION - 1 ITEM BELOW THE OTHER */}
        <View style={styles.cardsSection}>
          {/* 1. Sobre */}
          <View
            style={[
              styles.stackedCard,
              {
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                borderColor: isDark ? '#27272A' : '#ECEEF1',
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? '#27272A' : '#F5EFEB' }]}>
                <User size={18} color={isDark ? '#E4E4E7' : '#4B5563'} />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>Sobre</Text>
            </View>
            <Text style={[styles.cardBodyText, { color: isDark ? '#A1A1AA' : '#4B5563' }]}>{bio}</Text>
          </View>

          {/* 2. Objetivo da conexão */}
          <View
            style={[
              styles.stackedCard,
              {
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                borderColor: isDark ? '#27272A' : '#ECEEF1',
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#E6F4EA' }]}>
                <Handshake size={18} color="#059669" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>Objetivo da conexão</Text>
            </View>
            <Text style={[styles.cardBodyText, { color: isDark ? '#A1A1AA' : '#4B5563' }]}>{objective}</Text>
          </View>

          {/* 3. Viagem atual */}
          <View
            style={[
              styles.stackedRowCard,
              {
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                borderColor: isDark ? '#27272A' : '#ECEEF1',
              },
            ]}
          >
            <View style={styles.cardHeaderRowNoMargin}>
              <View style={[styles.iconCircleNoMargin, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#E6F7F5' }]}>
                <Briefcase size={18} color="#0D9488" />
              </View>
              <Text style={[styles.cardTitleNoMargin, { color: isDark ? '#FFFFFF' : '#111827' }]}>Viagem atual</Text>
            </View>

            <View
              style={[
                styles.destinationPill,
                {
                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.18)' : '#F0FDF4',
                  borderColor: isDark ? 'rgba(5, 150, 105, 0.35)' : '#DCFCE7',
                },
              ]}
            >
              <Text style={[styles.destinationText, { color: isDark ? '#34D399' : '#166534' }]}>
                {`Destino: ${destination}`}
              </Text>
              <Home size={14} color={isDark ? '#34D399' : '#166534'} />
            </View>
          </View>

          {/* 4. Interesses em comum */}
          <View
            style={[
              styles.stackedCard,
              {
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                borderColor: isDark ? '#27272A' : '#ECEEF1',
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
                <Star size={18} color="#F59E0B" fill="#F59E0B" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>Interesses em comum</Text>
            </View>
            <View style={styles.chipCluster}>
              {interests.map((item: string, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.smallChip,
                    {
                      backgroundColor: isDark ? '#27272A' : '#F3F4F6',
                    },
                  ]}
                >
                  <Text style={[styles.smallChipText, { color: isDark ? '#E4E4E7' : '#374151' }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 5. Idiomas */}
          <View
            style={[
              styles.stackedCard,
              {
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                borderColor: isDark ? '#27272A' : '#ECEEF1',
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#F3E8FF' }]}>
                <Globe size={18} color="#8B5CF6" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>Idiomas</Text>
            </View>
            <View style={styles.chipCluster}>
              {languages.map((lang: string, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.smallChip,
                    {
                      backgroundColor: isDark ? '#27272A' : '#F3F4F6',
                    },
                  ]}
                >
                  <Text style={[styles.smallChipText, { color: isDark ? '#E4E4E7' : '#374151' }]}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 6. Disponibilidade */}
          <View
            style={[
              styles.stackedRowCard,
              {
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                borderColor: isDark ? '#27272A' : '#ECEEF1',
              },
            ]}
          >
            <View style={styles.cardHeaderRowNoMargin}>
              <View style={[styles.iconCircleNoMargin, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#E6F7F5' }]}>
                <Calendar size={18} color="#0D9488" />
              </View>
              <Text style={[styles.cardTitleNoMargin, { color: isDark ? '#FFFFFF' : '#111827' }]}>Disponibilidade</Text>
            </View>

            <View style={styles.availabilityRight}>
              <Text style={[styles.availabilityText, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
                {availability}
              </Text>
              <ChevronRight size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 480,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroTopBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  moreButton: {
    padding: 4,
  },
  heroBottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 80,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0095F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metaPillText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  cardsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  stackedCard: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  stackedRowCard: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardHeaderRowNoMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleNoMargin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardTitleNoMargin: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardBodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  destinationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  destinationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  smallChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  availabilityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '400',
  },
});
