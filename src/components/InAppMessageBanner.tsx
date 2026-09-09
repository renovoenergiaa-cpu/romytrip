import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { useGlobalNotification } from '../context/GlobalNotificationContext';

export function InAppMessageBanner({ onNavigate }: { onNavigate: (conversationId: string) => void }) {
  const { messageBanner, dismissBanner } = useGlobalNotification();

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (messageBanner) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [messageBanner, slideAnim, opacityAnim]);

  if (!messageBanner) return null;

  const defaultAvatar =
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';

  const handlePress = () => {
    dismissBanner();
    onNavigate(messageBanner.conversationId);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={styles.card}
      >
        {/* Avatar */}
        <Image
          source={{ uri: messageBanner.senderPhoto || defaultAvatar }}
          style={styles.avatar}
        />

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={styles.senderName} numberOfLines={1}>
            {messageBanner.senderName}
          </Text>
          <Text style={styles.messagePreview} numberOfLines={2}>
            {messageBanner.messagePreview}
          </Text>
        </View>

        {/* Close button */}
        <TouchableOpacity
          onPress={dismissBanner}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeX}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    paddingHorizontal: 12,
    paddingTop: 52,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.97)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#6338FA',
  },
  textContent: {
    flex: 1,
  },
  senderName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  messagePreview: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  closeX: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});
