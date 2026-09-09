import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, ImageBackground, Platform, StatusBar } from 'react-native';
import { Sparkles, Check, X, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { LinearTransition, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { usePendingRequests, useRespondConnection } from '../src/hooks/useConnections';
import { spacing, typography, useTheme } from '../src/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: requests, isLoading } = usePendingRequests();
  const { mutate: respondConnection, isPending: isResponding } = useRespondConnection();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const handleRespond = (connectionId: string, status: 'accepted' | 'rejected') => {
    respondConnection({ connectionId, status });
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitações</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : Array.isArray(requests) && requests.length > 0 ? (
          requests.map((req: any) => {
            const sender = Array.isArray(req.users) ? req.users[0] : (req.users || req.sender || {});
            const mainImage = sender?.photos && sender.photos.length > 0 ? sender.photos[0] : defaultAvatar;
            const senderName = String(sender?.name || 'Viajante');

            return (
              <Animated.View 
                key={req.id} 
                style={styles.requestCardWrapper}
                layout={LinearTransition.springify().damping(15)}
                exiting={FadeOut.duration(200)}
              >
                <ImageBackground 
                  source={{ uri: mainImage }} 
                  style={styles.cardBackground} 
                  imageStyle={styles.imageStyle}
                >
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']} style={styles.gradientOverlay}>
                    <TouchableOpacity 
                      activeOpacity={0.9}
                      onPress={() => sender?.id && router.push(`/user/${sender.id}`)}
                      style={styles.touchableArea}
                    >
                      <BlurView intensity={isDark ? 40 : 20} tint={isDark ? "dark" : "light"} style={styles.blurPanel}>
                        <View style={styles.infoRow}>
                          <View style={styles.senderTextContainer}>
                            <Text style={styles.senderName}>{senderName}</Text>
                            <Text style={styles.senderLocation}>quer se conectar com você!</Text>
                          </View>

                          <View style={styles.actionsRow}>
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.rejectButton]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleRespond(req.id, 'rejected');
                              }}
                              disabled={isResponding}
                            >
                              <X size={24} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.acceptButton]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                handleRespond(req.id, 'accepted');
                              }}
                              disabled={isResponding}
                            >
                              <Check size={24} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  </LinearGradient>
                </ImageBackground>
              </Animated.View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Sparkles size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyText}>Nenhuma solicitação nova por enquanto.</Text>
            <Text style={styles.emptySubtext}>Continue explorando o mundo para conhecer mais pessoas!</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.md : spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.md,
  },
  requestCardWrapper: {
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  cardBackground: {
    width: '100%',
    height: 350,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: 24,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    justifyContent: 'flex-end',
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  blurPanel: {
    margin: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  senderName: {
    ...typography.h3,
    color: '#FFF',
    fontWeight: '800',
  },
  senderLocation: {
    ...typography.caption,
    color: '#FFF',
    opacity: 0.9,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
