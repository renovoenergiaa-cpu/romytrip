import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { useGlobalNotification } from '../context/GlobalNotificationContext';
import { useTheme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function IncomingCallBanner({ onNavigate }: { onNavigate: (conversationId: string, options?: { autoAcceptCall?: boolean; callType?: 'voice' | 'video' }) => void }) {
  const { incomingCall, acceptCallAndNavigate, rejectCall } = useGlobalNotification();
  const { colors } = useTheme();

  // Slide-in from top
  const slideAnim = useRef(new Animated.Value(-220)).current;
  // Pulse for avatar ring
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (incomingCall) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();

      // Pulse loop
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -220,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [incomingCall, slideAnim, pulseAnim]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    acceptCallAndNavigate((convId, type) => {
      onNavigate(convId, { autoAcceptCall: true, callType: type });
    });
  };

  const defaultAvatar =
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';

  const callLabel = incomingCall.callType === 'video' ? 'Chamada de vídeo' : 'Chamada de voz';

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="box-none"
    >
      {/* Blurred dark background */}
      <View style={styles.card}>
        {/* Top bar */}
        <View style={styles.topBar}>
          {incomingCall.callType === 'video' ? (
            <Video size={14} color="#A78BFA" />
          ) : (
            <Phone size={14} color="#A78BFA" />
          )}
          <Text style={styles.callTypeLabel}>{callLabel} recebida</Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Avatar with pulse */}
          <Animated.View
            style={[
              styles.avatarRing,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Image
              source={{ uri: incomingCall.callerPhoto || defaultAvatar }}
              style={styles.avatar}
            />
          </Animated.View>

          {/* Caller info */}
          <View style={styles.callerInfo}>
            <Text style={styles.callerName} numberOfLines={1}>
              {incomingCall.callerName}
            </Text>
            <Text style={styles.callerStatus}>Ligando para você...</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={rejectCall}
              activeOpacity={0.8}
            >
              <PhoneOff size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Phone size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingTop: 52, // safe area top offset
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 56, 250, 0.3)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 56, 250, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  callTypeLabel: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: '#6338FA',
    shadowColor: '#6338FA',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  avatar: {
    width: 51,
    height: 51,
    borderRadius: 25.5,
  },
  callerInfo: {
    flex: 1,
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  callerStatus: {
    color: '#A1A1AA',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
});
