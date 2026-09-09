import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles, MapPin, Clock, Users, HelpCircle, ChevronRight, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLocalEvents, useHelpRequests } from '../hooks/useDiscovery';
import { colors, spacing, typography, useTheme, radius } from '../theme';

interface DiscoveryModalProps {
  visible: boolean;
  onClose: () => void;
  currentCity: string;
}

export default function DiscoveryModal({ visible, onClose, currentCity }: DiscoveryModalProps) {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { data: events, isLoading: isLoadingEvents } = useLocalEvents();
  const { data: helps, isLoading: isLoadingHelps } = useHelpRequests('active');

  const topRatedTravelers = [
    { id: '1', name: 'André Costa', rating: 5.0, reviews: 47, trips: 12, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80' },
    { id: '2', name: 'Beatriz Lima', rating: 4.9, reviews: 38, trips: 9, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80' },
    { id: '3', name: 'Carlos Mendes', rating: 4.8, reviews: 29, trips: 7, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Você está em</Text>
              <Text style={[styles.headerTitle, { color: themeColors.primary }]}>{currentCity || 'Buscando local...'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: themeColors.surface }]}>
              <X size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
             <Text style={{ ...typography.body, color: themeColors.textSecondary, marginTop: spacing.xl }}>
               O &quot;Estou Aqui&quot; será sua central local no futuro!
             </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    // backgroundColor is set dynamically via themeColors.card
    height: '90%',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.primary,
  },
  closeBtn: {
    backgroundColor: '#E5E7EB',
    padding: 8,
    borderRadius: 20,
  },
  freeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  freeButtonText: {
    ...typography.h3,
    color: '#FFF',
    fontWeight: 'bold',
  },
  helpBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  helpIconBg: {
    backgroundColor: '#F59E0B',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  helpTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  helpTitle: {
    ...typography.h3,
    color: '#92400E',
    marginBottom: 2,
  },
  helpSubtitle: {
    ...typography.caption,
    color: '#B45309',
    lineHeight: 18,
  },
  helpBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  helpBadgeText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventsContainer: {
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitleWhite: {
    ...typography.h2,
    color: '#FFF',
  },
  eventCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  eventRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    ...typography.h3,
    color: '#FFF',
    fontWeight: 'bold',
    flex: 1,
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTime: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  eventDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.sm,
  },
  eventParticipantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventParticipantsText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  travelersContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeaderRowLight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitleDark: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  travelerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  travelerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  travelerInfo: {
    flex: 1,
  },
  travelerName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  travelerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelerRating: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
  travelerDot: {
    color: colors.textMuted,
  },
  travelerTrips: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  travelerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  travelerButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  seeMoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  seeMoreText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
