import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors } from '../../theme';
import { Handshake, X } from '../onboarding/icons';
import type { Traveler } from '../../hooks/useConnections';
import { TravelerCard } from './TravelerCard';

export type Decision = 'pass' | 'connect';

const NATIVE = Platform.OS !== 'web';
const DOCK = 92; // altura da faixa dos botões
const DISTANCE = 110; // arrastar além disso decide
const FLING = 0.5; // ou soltar rápido (px/ms) depois de um começo de arrasto

/** Um viajante por vez: arraste para o lado ou use os botões. */
export function Deck({ current, next, onDecide, onDone, onOpenProfile }: {
  current: Traveler;
  next?: Traveler;
  /** Assim que a pessoa decide (antes da animação), para o pedido sair logo */
  onDecide: (decision: Decision, traveler: Traveler) => void;
  /** Quando o cartão terminou de sair */
  onDone: (decision: Decision, traveler: Traveler) => void;
  onOpenProfile: (traveler: Traveler) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, 560);

  const [pan] = useState(() => new Animated.Value(0));
  const leaving = useRef(false);

  const decide = (decision: Decision) => {
    if (leaving.current) return;
    leaving.current = true;
    const traveler = current;
    if (NATIVE) Haptics.impactAsync(decision === 'connect' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDecide(decision, traveler);
    Animated.timing(pan, {
      toValue: (decision === 'connect' ? 1 : -1) * width * 1.2,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start(() => onDone(decision, traveler));
  };

  // O PanResponder é criado uma vez; ele chama sempre a versão mais nova de decide
  const decideRef = useRef(decide);
  useEffect(() => { decideRef.current = decide; });

  // Cartão novo na frente: volta ao centro
  useLayoutEffect(() => {
    pan.setValue(0);
    leaving.current = false;
  }, [current.id, pan]);

  // eslint-disable-next-line react-hooks/refs -- os handlers só leem os refs durante o gesto, nunca na renderização
  const [responder] = useState(() => {
    const snapBack = () => Animated.spring(pan, { toValue: 0, damping: 20, stiffness: 200, mass: 0.8, useNativeDriver: NATIVE }).start();
    return PanResponder.create({
      // Só arrasto na horizontal: o cartão continua rolando na vertical
      onMoveShouldSetPanResponder: (_, g) => !leaving.current && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => pan.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const fling = Math.abs(g.vx) > FLING && Math.abs(g.dx) > 40;
        if (g.dx > DISTANCE || (fling && g.vx > 0)) decideRef.current('connect');
        else if (g.dx < -DISTANCE || (fling && g.vx < 0)) decideRef.current('pass');
        else snapBack();
      },
      onPanResponderTerminate: snapBack,
    });
  });

  const rotate = pan.interpolate({ inputRange: [-width, 0, width], outputRange: ['-6deg', '0deg', '6deg'] });
  const connectHint = pan.interpolate({ inputRange: [0, 90], outputRange: [0, 1], extrapolate: 'clamp' });
  const passHint = pan.interpolate({ inputRange: [-90, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pan.interpolate({ inputRange: [-width, 0, width], outputRange: [1, 0.96, 1], extrapolate: 'clamp' });
  const firstName = current.name.split(/\s+/)[0];

  return (
    <View style={s.root}>
      {next ? (
        <Animated.View key={`next-${next.id}`} pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ scale: nextScale }] }]}>
          <TravelerCard traveler={next} active={false} bottomInset={DOCK + 16} onOpenProfile={() => {}} />
        </Animated.View>
      ) : null}

      <Animated.View
        key={`card-${current.id}`}
        style={[StyleSheet.absoluteFill, s.front, { transform: [{ translateX: pan }, { rotate }] }]}
        {...responder.panHandlers}
      >
        <TravelerCard traveler={current} active bottomInset={DOCK + 16} onOpenProfile={() => onOpenProfile(current)} />
        <Animated.View pointerEvents="none" style={[s.hint, s.hintConnect, { opacity: connectHint }]}>
          <Handshake size={18} weight="fill" color={colors.onPrimary} />
          <Text style={s.hintText}>Conectar</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[s.hint, s.hintPass, { opacity: passHint }]}>
          <X size={18} weight="bold" color="#FFFFFF" />
          <Text style={s.hintText}>Passar</Text>
        </Animated.View>
      </Animated.View>

      <View style={s.dock} pointerEvents="box-none">
        <LinearGradient colors={[`${colors.background}00`, colors.background]} locations={[0, 0.45]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <Pressable
          onPress={() => decide('pass')}
          accessibilityRole="button"
          accessibilityLabel={`Passar ${firstName}`}
          style={({ pressed }) => [s.passBtn, pressed && s.pressed]}
        >
          <X size={26} weight="bold" color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => decide('connect')}
          accessibilityRole="button"
          accessibilityLabel={`Conectar com ${firstName}`}
          style={({ pressed }) => [s.connectBtn, pressed && s.pressed]}
        >
          <Handshake size={24} weight="fill" color={colors.onPrimary} />
          <Text style={s.connectText}>Conectar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  front: { backgroundColor: c.background },
  pressed: { transform: [{ scale: 0.96 }] },

  hint: {
    position: 'absolute', top: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, paddingHorizontal: 14, borderRadius: 999,
  },
  hintConnect: { left: 36, backgroundColor: c.primary },
  hintPass: { right: 36, backgroundColor: 'rgba(10,10,12,0.72)' },
  hintText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: DOCK, paddingHorizontal: 20, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'flex-end', gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center',
  },
  passBtn: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  connectBtn: {
    flex: 1, height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: c.primary,
    shadowColor: c.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  connectText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },
});
