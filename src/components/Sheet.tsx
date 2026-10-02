import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../theme';
import { X } from '../features/onboarding/icons';
import { modalKeyboardBehavior } from '../lib/keyboard';

/** Folha que sobe de baixo (opções, nova conversa, comentários). Fecha tocando no fundo ou no X. */
export function Sheet({ visible, onClose, title, children, fill = false }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Ocupa quase toda a altura (listas longas, como comentários). */
  fill?: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => sheetStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible, enter]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: enter }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <KeyboardAvoidingView behavior={modalKeyboardBehavior} style={s.keyboard} pointerEvents="box-none">
        <Animated.View
          style={[
            s.card,
            fill && s.cardFill,
            { paddingBottom: Math.max(insets.bottom, 12) + 12, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] },
          ]}
        >
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
              <X size={20} weight="bold" color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const sheetStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  card: {
    // flexShrink: com o teclado aberto, a folha encolhe em vez de passar do topo da tela
    width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '80%', flexShrink: 1,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10,
    backgroundColor: c.card,
  },
  cardFill: { height: '78%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: c.border, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3 },
});

