import { View, Text, StyleSheet, Switch, Image, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Sparkles, MapPin, X, Zap } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useFreeUsers, useToggleFreeStatus } from '../src/hooks/useDiscovery';
import { supabase } from '../src/lib/supabase';
import { colors, spacing, typography } from '../src/theme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

export default function FreeStatusScreen() {
  const router = useRouter();
  const { data: freeUsers, isLoading: isLoadingUsers } = useFreeUsers();
  const { mutate: toggleFree } = useToggleFreeStatus();
  
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('is_free').eq('id', user.id).single();
      if (data) {
        setIsFree(data.is_free);
      }
    })();
  }, []);

  const handleToggle = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFree(val);
    toggleFree(val);
  };

  // Pulse animation for online dot
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value
    };
  });

  const defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={{ padding: 8 }}>
          <X size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main Status Card with Neon Glow */}
        <View style={[styles.statusCardWrapper, isFree && styles.neonGlow]}>
          <LinearGradient colors={['#1F1135', '#0A0514']} style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.iconCircle}>
                <Sparkles size={24} color={isFree ? "#D936B4" : "#6338FA"} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.statusCardTitle}>Estou Livre</Text>
                <Text style={[styles.statusCardSubtitle, isFree && { color: '#D936B4', fontWeight: 'bold' }]}>
                  {isFree ? 'Ativo' : 'Desativado'}
                </Text>
              </View>
              <Switch 
                value={isFree} 
                onValueChange={handleToggle} 
                trackColor={{ false: '#333', true: 'rgba(217, 54, 180, 0.5)' }}
                thumbColor={isFree ? "#D936B4" : "#f4f3f4"}
              />
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusFooter}>
              <Sparkles size={16} color="rgba(255,255,255,0.4)" />
              <Text style={styles.statusFooterText}>
                Com este status, pessoas próximas poderão te convidar para explorar agora.
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Online Agora</Text>
          <View style={styles.onlineBadge}>
            <Animated.View style={[styles.liveDot, animatedDotStyle]} />
            <Text style={styles.onlineBadgeText}>{freeUsers?.length || 0} online por perto</Text>
          </View>
        </View>

        {/* Users List with Candid Layout */}
        <View style={styles.gridContainer}>
          {isLoadingUsers ? (
            <ActivityIndicator size="large" color="#D936B4" style={{ marginTop: 40 }} />
          ) : freeUsers && freeUsers.length > 0 ? (
            freeUsers.map((user: any) => {
              const avatar = user.photos && user.photos.length > 0 ? user.photos[0] : defaultAvatar;
              return (
                <TouchableOpacity 
                  key={user.id} 
                  style={styles.gridCard} 
                  activeOpacity={0.9}
                  onPress={() => router.push(`/user/${user.id}`)}
                >
                  <ImageBackground source={{ uri: avatar }} style={styles.cardBg} imageStyle={{ borderRadius: 16 }}>
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cardGradient}>
                      <BlurView intensity={30} tint="dark" style={styles.cardBlurInfo}>
                        <View style={styles.cardNameRow}>
                          <Text style={styles.cardName}>{user.name}</Text>
                          <Animated.View style={[styles.liveIndicator, animatedDotStyle]} />
                        </View>
                        <View style={styles.cardLocationRow}>
                          <MapPin size={10} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.cardLocation}>A 2km</Text>
                        </View>
                      </BlurView>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              )
            })
          ) : (
            <View style={{ padding: 40, alignItems: 'center', width: '100%' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', ...typography.body }}>Nenhuma pessoa livre por perto no momento.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Dark aesthetic
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    ...typography.h2,
    color: '#FFF',
  },
  scrollContent: {
    padding: spacing.md,
  },
  statusCardWrapper: {
    marginBottom: spacing.xxl,
    borderRadius: 24,
  },
  neonGlow: {
    shadowColor: '#D936B4',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  statusCard: {
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusCardTitle: {
    ...typography.h2,
    color: '#FFF',
    marginBottom: 2,
  },
  statusCardSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
  },
  statusDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.md,
  },
  statusFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  statusFooterText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: '#FFF',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 54, 180, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 54, 180, 0.3)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D936B4',
    marginRight: 6,
  },
  onlineBadgeText: {
    color: '#D936B4',
    fontWeight: 'bold',
    fontSize: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    height: 250,
    marginBottom: spacing.md,
    borderRadius: 16,
  },
  cardBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: 16,
  },
  cardBlurInfo: {
    padding: spacing.sm,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    ...typography.body,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardLocation: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
});
