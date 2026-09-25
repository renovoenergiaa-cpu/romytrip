import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import {
  X,
  MoreHorizontal,
  MapPin,
  Calendar,
  Eye,
  Share2,
  Music,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

const { width, height } = Dimensions.get('window');

export interface MomentoDetailModalProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    media_url?: string;
    image_url?: string;
    destination?: string;
    description?: string;
    caption?: string;
    created_at?: string;
    audio_title?: string;
  } | null;
  onViewInFeed: (postId: string) => void;
  onOptionsPress: (post: any) => void;
}

export default function MomentoDetailModal({
  visible,
  onClose,
  post,
  onViewInFeed,
  onOptionsPress,
}: MomentoDetailModalProps) {
  const { colors, isDark } = useTheme();

  if (!post) return null;

  const imageUrl =
    post.media_url ||
    post.image_url ||
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  const description = post.description || post.caption || 'Sem descrição cadastrada.';
  const destination = post.destination || 'Local registrado';
  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouch} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.containerCard,
            {
              backgroundColor: isDark ? '#141416' : '#FFFFFF',
              borderColor: isDark ? '#27272A' : '#E4E4E7',
            },
          ]}
        >
          {/* Top Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? '#FFFFFF' : '#111827' },
                ]}
              >
                Momento
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.iconButton,
                  { backgroundColor: isDark ? '#27272A' : '#F4F4F5' },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onOptionsPress(post);
                }}
                accessibilityLabel="Opções do momento"
                accessibilityRole="button"
              >
                <MoreHorizontal
                  size={19}
                  color={isDark ? '#E4E4E7' : '#3F3F46'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.iconButton,
                  { backgroundColor: isDark ? '#27272A' : '#F4F4F5' },
                ]}
                onPress={onClose}
              >
                <X size={19} color={isDark ? '#E4E4E7' : '#3F3F46'} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Media Image Container */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.mainImage}
                resizeMode="cover"
              />

              {/* Floating Destination Badge */}
              <View style={styles.destinationChip}>
                <MapPin size={13} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.destinationChipText} numberOfLines={1}>
                  {destination}
                </Text>
              </View>

              {/* Music Badge (if available) */}
              {post.audio_title && (
                <View style={styles.musicChip}>
                  <Music size={12} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.musicChipText} numberOfLines={1}>
                    {post.audio_title}
                  </Text>
                </View>
              )}
            </View>

            {/* Meta and Description */}
            <View style={styles.infoSection}>
              {formattedDate ? (
                <View style={styles.dateRow}>
                  <Calendar
                    size={13}
                    color={isDark ? '#A1A1AA' : '#6B7280'}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.dateText,
                      { color: isDark ? '#A1A1AA' : '#6B7280' },
                    ]}
                  >
                    Publicado em {formattedDate}
                  </Text>
                </View>
              ) : null}

              <Text
                style={[
                  styles.descriptionText,
                  { color: isDark ? '#F4F4F5' : '#1F2937' },
                ]}
              >
                {description}
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View
            style={[
              styles.bottomBar,
              {
                borderTopColor: isDark ? '#27272A' : '#F1F1F4',
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.viewInFeedButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
                onViewInFeed(post.id);
              }}
            >
              <Eye size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.viewInFeedButtonText}>Ver no Feed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  containerCard: {
    maxHeight: height * 0.88,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  imageContainer: {
    width: '100%',
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E1E24',
    position: 'relative',
    marginBottom: 16,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  destinationChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  destinationChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 200,
  },
  musicChip: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99, 56, 250, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  musicChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 220,
  },
  infoSection: {
    paddingHorizontal: 2,
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
  },
  viewInFeedButton: {
    height: 50,
    backgroundColor: '#6338FA',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#6338FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  viewInFeedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
