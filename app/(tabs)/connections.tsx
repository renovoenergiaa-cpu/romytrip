import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Switch,
  PanResponder,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Menu,
  Bell,
  SlidersHorizontal,
  X,
  Handshake,
  Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useDiscoveryTravelers, useRequestConnection } from '../../src/hooks/useConnections';
import { spacing, typography, useTheme, motion } from '../../src/theme';
import { TravelerProfileCard } from '../../src/components/TravelerProfileCard';
import { Chip } from '../../src/components/Chip';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ConnectionsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    gender: 'Todos',
    minAge: 18,
    maxAge: 100,
    budget: 'Todos',
    isTopRatedMode: false,
  });
  const [isInvisible, setIsInvisible] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  const [tempInvisible, setTempInvisible] = useState(isInvisible);

  const { data: travelers, isLoading } = useDiscoveryTravelers(filters);
  const { mutate: requestConnection, isPending: isRequesting } = useRequestConnection();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [favoriteActive, setFavoriteActive] = useState(false);

  // Prevent double-tapping / concurrent actions
  const isActionInProgress = useRef(false);

  // Reanimated shared values for Card Reaction and Next Card Pre-rendering
  const cardTranslateX = useSharedValue<number>(0);
  const cardRotateZ = useSharedValue<number>(0);
  const rejectOverlayOpacity = useSharedValue<number>(0);
  const connectOverlayOpacity = useSharedValue<number>(0);
  const imagePulseScale = useSharedValue<number>(1);

  // Next card background scale and translation
  const nextCardScale = useSharedValue<number>(motion.card.nextProfileInitial.scale);
  const nextCardTranslateY = useSharedValue<number>(motion.card.nextProfileInitial.translateY);

  // Button interaction physics
  const passButtonScale = useSharedValue<number>(1);
  const connectButtonScale = useSharedValue<number>(1);
  const saveButtonScale = useSharedValue<number>(1);

  useEffect(() => {
    // Sync persisted privacy settings on mount
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('users').select('privacy_settings').eq('id', user.id).maybeSingle();
          if (data?.privacy_settings?.publicProfile === false) {
            setIsInvisible(true);
            setTempInvisible(true);
          }
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    // Reset index when fresh traveler data is received
    setCurrentIndex(0);
    isActionInProgress.current = false;
    cardTranslateX.value = 0;
    cardRotateZ.value = 0;
    rejectOverlayOpacity.value = 0;
    connectOverlayOpacity.value = 0;
    nextCardScale.value = motion.card.nextProfileInitial.scale;
    nextCardTranslateY.value = motion.card.nextProfileInitial.translateY;
  }, [travelers]);

  const currentTraveler = travelers?.[currentIndex];
  const nextTraveler = travelers?.[currentIndex + 1];

  // Callback executed on JS thread when the exit animation completes
  const advanceToNextProfile = () => {
    setCurrentIndex((prev) => prev + 1);

    // Reset card animation values for the newly active profile
    cardTranslateX.value = 0;
    cardRotateZ.value = 0;
    rejectOverlayOpacity.value = 0;
    connectOverlayOpacity.value = 0;
    nextCardScale.value = motion.card.nextProfileInitial.scale;
    nextCardTranslateY.value = motion.card.nextProfileInitial.translateY;

    isActionInProgress.current = false;
  };

  // Reject Action (Passar)
  const handlePass = () => {
    if (isActionInProgress.current || !currentTraveler) return;
    isActionInProgress.current = true;

    // Haptics: Medium for reject/pass
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Button physical feedback
    passButtonScale.value = withSequence(
      withSpring(motion.button.pressedScale, motion.springs.button),
      withSpring(1, motion.springs.button)
    );

    // Card reaction: translateX negative, rotateZ max -1.5deg, subtle red overlay, then exit
    rejectOverlayOpacity.value = withTiming(0.18, { duration: motion.timings.overlay });
    cardRotateZ.value = withTiming(-motion.card.maxRotationDeg, { duration: motion.timings.cardExit });
    cardTranslateX.value = withTiming(
      -SCREEN_WIDTH * 1.15,
      { duration: motion.timings.cardExit, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(advanceToNextProfile)();
        }
      }
    );

    // Next profile animates smoothly from behind: scale -> 1, translateY -> 0
    nextCardScale.value = withSpring(motion.card.activeProfile.scale, motion.springs.card);
    nextCardTranslateY.value = withSpring(motion.card.activeProfile.translateY, motion.springs.card);
  };

  // Connect Action (Conectar)
  const handleConnect = () => {
    if (isActionInProgress.current || !currentTraveler) return;
    isActionInProgress.current = true;

    // Haptics: Medium for connect trigger
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Button physical feedback
    connectButtonScale.value = withSequence(
      withSpring(motion.button.pressedScale, motion.springs.button),
      withSpring(1, motion.springs.button)
    );

    // Card reaction: translateX positive, rotateZ max 1.5deg, subtle brand overlay, then exit
    connectOverlayOpacity.value = withTiming(0.18, { duration: motion.timings.overlay });
    cardRotateZ.value = withTiming(motion.card.maxRotationDeg, { duration: motion.timings.cardExit });
    cardTranslateX.value = withTiming(
      SCREEN_WIDTH * 1.15,
      { duration: motion.timings.cardExit, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(advanceToNextProfile)();
        }
      }
    );

    // Next profile animates smoothly from behind
    nextCardScale.value = withSpring(motion.card.activeProfile.scale, motion.springs.card);
    nextCardTranslateY.value = withSpring(motion.card.activeProfile.translateY, motion.springs.card);

    // Request connection on backend
    requestConnection(currentTraveler.id, {
      onSuccess: () => {
        // Successful connection: Success notification
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  // Favorite Action (Salvar)
  const handleSuperConnect = () => {
    if (isActionInProgress.current || !currentTraveler) return;

    // Favorite: card remains! Small feedback on button and image
    setFavoriteActive(true);

    // Button physical feedback
    saveButtonScale.value = withSequence(
      withSpring(motion.button.pressedScale, motion.springs.button),
      withSpring(1, motion.springs.button)
    );

    // Image micro feedback
    imagePulseScale.value = withSequence(
      withTiming(1.02, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(1, motion.springs.micro)
    );

    // Haptics: Heavy for Save / Favorite
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    requestConnection(currentTraveler.id, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });

    setTimeout(() => {
      setFavoriteActive(false);
    }, 1200);
  };

  // Gesture Handler: Purely horizontal swipe with snap back or exit
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (isActionInProgress.current || !currentTraveler) return false;
          // Capture horizontal swipes only; preserve smooth vertical scrolling in profile
          return (
            Math.abs(gestureState.dx) > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          );
        },
        onPanResponderMove: (_, gestureState) => {
          if (isActionInProgress.current) return;
          cardTranslateX.value = gestureState.dx;

          // Subtle card rotation limited to +/- 1.5deg
          const ratio = Math.max(-1, Math.min(1, gestureState.dx / (SCREEN_WIDTH * 0.6)));
          cardRotateZ.value = ratio * motion.card.maxRotationDeg;

          // Dynamic subtle overlays
          if (gestureState.dx < 0) {
            rejectOverlayOpacity.value = Math.min(
              0.22,
              (Math.abs(gestureState.dx) / (SCREEN_WIDTH * 0.5)) * 0.22
            );
            connectOverlayOpacity.value = 0;
          } else {
            connectOverlayOpacity.value = Math.min(
              0.22,
              (Math.abs(gestureState.dx) / (SCREEN_WIDTH * 0.5)) * 0.22
            );
            rejectOverlayOpacity.value = 0;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isActionInProgress.current) return;
          const threshold = 110;

          if (gestureState.dx < -threshold) {
            handlePass();
          } else if (gestureState.dx > threshold) {
            handleConnect();
          } else {
            // Cancel -> Snap back using card spring preset
            cardTranslateX.value = withSpring(0, motion.springs.card);
            cardRotateZ.value = withSpring(0, motion.springs.card);
            rejectOverlayOpacity.value = withTiming(0, { duration: 150 });
            connectOverlayOpacity.value = withTiming(0, { duration: 150 });
          }
        },
        onPanResponderTerminate: () => {
          // Terminate -> Snap back smoothly
          cardTranslateX.value = withSpring(0, motion.springs.card);
          cardRotateZ.value = withSpring(0, motion.springs.card);
          rejectOverlayOpacity.value = withTiming(0, { duration: 150 });
          connectOverlayOpacity.value = withTiming(0, { duration: 150 });
        },
      }),
    [currentTraveler, currentIndex]
  );

  // Reanimated Animated Styles
  const animatedForegroundCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: cardTranslateX.value },
        { rotateZ: `${cardRotateZ.value}deg` },
      ],
    };
  });

  const animatedBackgroundCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: nextCardScale.value },
        { translateY: nextCardTranslateY.value },
      ],
      opacity: interpolate(
        nextCardScale.value,
        [motion.card.nextProfileInitial.scale, 1],
        [0.92, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const animatedRejectOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: rejectOverlayOpacity.value,
    };
  });

  const animatedConnectOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: connectOverlayOpacity.value,
    };
  });

  const animatedImagePulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: imagePulseScale.value }],
    };
  });

  const animatedPassButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: passButtonScale.value }],
    };
  });

  const animatedConnectButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: connectButtonScale.value }],
    };
  });

  const animatedSaveButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: saveButtonScale.value }],
    };
  });

  // Dynamic overlay elements for active card
  const foregroundOverlay = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#EF4444' },
          animatedRejectOverlayStyle,
        ]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#00A86B' },
          animatedConnectOverlayStyle,
        ]}
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A86B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0A0A0A' : '#F8F9FA' }]}>
      {/* HEADER: Menu | Descobrir | Sliders | Bell */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/settings');
          }}
          accessibilityLabel="Menu principal"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Menu size={24} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
          Descobrir
        </Text>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              setTempFilters(filters);
              setTempInvisible(isInvisible);
              setFiltersModalVisible(true);
            }}
            accessibilityLabel="Filtros de descoberta"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SlidersHorizontal size={22} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notificações"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={22} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* PROFILE CONTENT: Stack Pre-rendering */}
      {!currentTraveler ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? '#FFF' : '#1A1A1A' }]}>
            Sem mais viajantes na sua área.
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
            Volte mais tarde ou expanda seus filtros de busca!
          </Text>
        </View>
      ) : (
        <View style={styles.profileWrapper}>
          {/* Background Next Profile (pre-rendered smoothly behind) */}
          {nextTraveler ? (
            <Animated.View
              key={`bg-${nextTraveler.id}`}
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 1 },
                animatedBackgroundCardStyle,
              ]}
            >
              <TravelerProfileCard
                traveler={nextTraveler}
                scrollEnabled={false}
                colors={colors}
                isDark={isDark}
              />
            </Animated.View>
          ) : null}

          {/* Foreground Active Profile with PanResponder and dynamic reaction */}
          <Animated.View
            key={`fg-${currentTraveler.id}`}
            style={[
              StyleSheet.absoluteFill,
              { zIndex: 2 },
              animatedForegroundCardStyle,
            ]}
            {...panResponder.panHandlers}
          >
            <TravelerProfileCard
              traveler={currentTraveler}
              scrollEnabled={true}
              imageAnimatedStyle={animatedImagePulseStyle}
              overlayElement={foregroundOverlay}
              colors={colors}
              isDark={isDark}
            />
          </Animated.View>
        </View>
      )}

      {/* BOTTOM ACTION DOCK: Passar | Conectar | Salvar */}
      {currentTraveler ? (
        <View
          style={[
            styles.bottomDock,
            {
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderTopColor: isDark ? '#27272A' : '#F1F3F5',
            },
          ]}
        >
          {/* Action 1: Passar */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePass}
            disabled={isRequesting}
            style={styles.actionColumn}
            accessibilityLabel="Passar perfil"
            accessibilityRole="button"
          >
            <Animated.View
              style={[
                styles.actionCircleBtn,
                styles.passBtnCircle,
                {
                  backgroundColor: isDark ? '#27272A' : '#F9FAFB',
                  borderColor: isDark ? '#3F3F46' : '#E5E7EB',
                },
                animatedPassButtonStyle,
              ]}
            >
              <X size={22} color={isDark ? '#F4F4F5' : '#1F2937'} strokeWidth={2.2} />
            </Animated.View>
            <Text style={[styles.actionLabel, { color: isDark ? '#A1A1AA' : '#4B5563' }]}>Passar</Text>
          </TouchableOpacity>

          {/* Action 2: Conectar (Emerald Green Hero) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleConnect}
            disabled={isRequesting}
            style={styles.actionColumn}
            accessibilityLabel="Conectar"
            accessibilityRole="button"
          >
            <Animated.View
              style={[
                styles.actionCircleBtn,
                styles.connectBtnCircle,
                animatedConnectButtonStyle,
              ]}
            >
              <Handshake size={30} color="#FFFFFF" strokeWidth={2.2} />
            </Animated.View>
            <Text style={[styles.actionLabel, styles.connectLabel]}>Conectar</Text>
            {/* Active Indicator Line */}
            <View style={styles.activeIndicatorLine} />
          </TouchableOpacity>

          {/* Action 3: Salvar */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSuperConnect}
            disabled={isRequesting}
            style={styles.actionColumn}
            accessibilityLabel="Salvar perfil"
            accessibilityRole="button"
          >
            <Animated.View
              style={[
                styles.actionCircleBtn,
                styles.saveBtnCircle,
                {
                  backgroundColor: isDark ? '#27272A' : '#F9FAFB',
                  borderColor: isDark ? '#3F3F46' : '#E5E7EB',
                },
                animatedSaveButtonStyle,
              ]}
            >
              <Star
                size={22}
                color={favoriteActive ? '#F59E0B' : (isDark ? '#F4F4F5' : '#1E293B')}
                fill={favoriteActive ? '#F59E0B' : (isDark ? '#F4F4F5' : '#1E293B')}
              />
            </Animated.View>
            <Text style={[styles.actionLabel, { color: isDark ? '#A1A1AA' : '#4B5563' }]}>Salvar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* FILTERS MODAL */}
      <Modal
        visible={filtersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFiltersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setFiltersModalVisible(false)}>
                <Text style={{ fontSize: 20, color: colors.textPrimary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
              <View>
                <Text style={styles.filterSectionTitle}>Quem você quer ver?</Text>
                <View style={styles.filterChipRow}>
                  {['Todos', 'Feminino', 'Masculino'].map((g) => (
                    <Chip
                      key={g}
                      label={g === 'Feminino' ? 'Mulheres' : g === 'Masculino' ? 'Homens' : 'Todos'}
                      selected={tempFilters.gender === g}
                      onPress={() => setTempFilters({ ...tempFilters, gender: g })}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.filterSectionTitle}>Idade</Text>
                <View style={styles.filterChipRow}>
                  {[
                    { label: 'Todos', min: 18, max: 100 },
                    { label: '18-25', min: 18, max: 25 },
                    { label: '26-35', min: 26, max: 35 },
                    { label: '36-50', min: 36, max: 50 },
                    { label: '50+', min: 51, max: 100 },
                  ].map((age) => (
                    <Chip
                      key={age.label}
                      label={age.label}
                      selected={tempFilters.minAge === age.min && tempFilters.maxAge === age.max}
                      onPress={() =>
                        setTempFilters({ ...tempFilters, minAge: age.min, maxAge: age.max })
                      }
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.filterSectionTitle}>Orçamento de Viagem</Text>
                <View style={styles.filterChipRow}>
                  {['Todos', 'Econômico', 'Conforto', 'Luxo'].map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      selected={tempFilters.budget === b}
                      onPress={() => setTempFilters({ ...tempFilters, budget: b })}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.filterSectionTitle}>Modo Invisível</Text>
                <Text style={styles.filterSectionSub}>
                  Navegue por perfis sem que outras pessoas vejam você na lista de descobertas delas.
                </Text>
                <View style={[styles.invisibleModeRow, { marginTop: spacing.md }]}>
                  <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                    Ativar Modo Fantasma
                  </Text>
                  <Switch
                    value={tempInvisible}
                    onValueChange={setTempInvisible}
                    trackColor={{ false: '#767577', true: '#00A86B' }}
                    thumbColor="#f4f3f4"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={async () => {
                  setCurrentIndex(0);
                  setFilters(tempFilters);
                  setIsInvisible(tempInvisible);
                  setFiltersModalVisible(false);

                  // Persist gender preference and ghost mode in Supabase database
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const updates: any = {};
                      if (tempFilters.gender) {
                        updates.gender_preference =
                          tempFilters.gender === 'Feminino' || tempFilters.gender === 'Mulheres'
                            ? 'female'
                            : tempFilters.gender === 'Masculino' || tempFilters.gender === 'Homens'
                            ? 'male'
                            : 'all';
                      }
                      const { data: userRow } = await supabase
                        .from('users')
                        .select('privacy_settings')
                        .eq('id', user.id)
                        .maybeSingle();
                      const currentPrivacy = userRow?.privacy_settings || {};
                      updates.privacy_settings = { ...currentPrivacy, publicProfile: !tempInvisible };
                      await supabase.from('users').update(updates).eq('id', user.id);
                    }
                  } catch (e) {
                    // non-blocking
                  }
                }}
              >
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 8,
      paddingBottom: 8,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.4,
    },
    headerRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    notificationDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#F59E0B',
      borderWidth: 1.5,
      borderColor: isDark ? '#0A0A0A' : '#FFFFFF',
    },
    profileWrapper: {
      flex: 1,
      position: 'relative',
    },
    bottomDock: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 24 : 14,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 8,
      zIndex: 20,
    },
    actionColumn: {
      alignItems: 'center',
      gap: 5,
      position: 'relative',
      minWidth: 70,
    },
    actionCircleBtn: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    passBtnCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
    },
    connectBtnCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#00A86B',
      shadowColor: '#00A86B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    saveBtnCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    connectLabel: {
      color: '#00A86B',
      fontWeight: '700',
    },
    activeIndicatorLine: {
      width: 32,
      height: 2.5,
      backgroundColor: '#00A86B',
      borderRadius: 1.5,
      marginTop: 2,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 15,
      fontWeight: '400',
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    filterSectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    filterSectionSub: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: -4,
      lineHeight: 18,
    },
    filterChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    invisibleModeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalFooter: {
      padding: spacing.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    },
    applyButton: {
      backgroundColor: '#00A86B',
      borderRadius: 12,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
