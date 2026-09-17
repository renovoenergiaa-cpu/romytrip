import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, BadgeCheck, Sparkles, UserX } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserProfile, useConnectionStatus, useRequestConnection } from '../../src/hooks/useConnections';
import { useStartConversation } from '../../src/hooks/useMessenger';
import { colors, spacing, typography, useTheme, radius, shadows } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { data: profile, isLoading } = useUserProfile(id as string);
  const { data: connection, isLoading: isLoadingConnection } = useConnectionStatus(id as string);
  const { mutate: requestConnection, isPending: isRequesting } = useRequestConnection();
  const { mutate: startConversation, isPending: isStartingChat } = useStartConversation();

  const containerStyle = { flex: 1, backgroundColor: colors.background };

  if (isLoading) {
    return (
      <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isDeleted = !profile || profile.name === 'Conta Excluída' || profile.name === 'Usuário Romy';

  if (isDeleted) {
    return (
      <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <UserX size={56} color={colors.textMuted} style={{ marginBottom: 16 }} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
          Conta não disponível
        </Text>
        <Text style={{ ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: 24, maxWidth: 300 }}>
          Este perfil não está mais disponível porque o usuário excluiu sua conta do Romy.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🔒 VULN-10 Fix: Respect privacy_settings (publicProfile)
  const isSelf = connection?.status === 'self';
  const isPrivateProfile = profile.privacy_settings?.publicProfile === false && !isSelf && connection?.status !== 'accepted';

  if (isPrivateProfile) {
    return (
      <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <UserX size={56} color={colors.textMuted} style={{ marginBottom: 16 }} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
          Perfil Privado
        </Text>
        <Text style={{ ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: 24, maxWidth: 300 }}>
          Este viajante optou por manter o perfil visível apenas para conexões aceitas.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleConnect = () => {
    if (connection?.status === 'none') {
      requestConnection(id as string);
    } else if (connection?.status === 'accepted') {
      startConversation(id as string, {
        onSuccess: (conversationId) => {
          router.push({ pathname: '/chat/[id]', params: { id: conversationId, name: profile.name, recipientId: id as string } });
        }
      });
    }
  };

  const getButtonText = () => {
    if (isLoadingConnection) return 'Carregando...';
    if (connection?.status === 'self') return 'Este é o seu perfil';
    if (connection?.status === 'pending') {
      return connection.isSender ? 'Solicitação Enviada' : 'Solicitação Recebida';
    }
    if (connection?.status === 'accepted') return 'Enviar Mensagem';
    if (connection?.status === 'rejected') return 'Não conectado';
    return 'Solicitar Conexão';
  };

  const getButtonDisabled = () => {
    return isLoadingConnection || isRequesting || isStartingChat || (connection?.status !== 'none' && connection?.status !== 'accepted');
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  const mainImage = profile.photos && profile.photos.length > 0 ? profile.photos[0] : defaultAvatar;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back Button Overlay — positioned using safe area insets */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.backButtonBg}>
          <ArrowLeft size={24} color="#FFF" />
        </View>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Photo Section */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: mainImage }} style={styles.image} />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          >
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}</Text>
              <BadgeCheck size={28} color={colors.primary} fill="#FFF" style={{ marginLeft: 8 }} />
            </View>
            
            {profile.privacy_settings?.showLocation !== false && (
              <View style={styles.infoRow}>
                <MapPin size={18} color={colors.surface} />
                <Text style={styles.infoText}>{profile.city || 'Local Desconhecido'}</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sobre mim</Text>
          <Text style={[styles.bioText, { color: colors.textSecondary }]}>{profile.bio || 'Sem biografia.'}</Text>

          {profile.travel_styles && profile.travel_styles.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Estilo de Viagem</Text>
              <View style={styles.tagsContainer}>
                {profile.travel_styles.map((style: string, idx: number) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{style}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Interesses</Text>
              <View style={styles.tagsContainer}>
                {profile.interests.map((interest: string, idx: number) => (
                  <View key={idx} style={[styles.interestTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.interestTagText, { color: colors.textSecondary }]}>{interest}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Other photos if any */}
          {profile.photos && profile.photos.length > 1 && (
            <View style={styles.morePhotosContainer}>
              {profile.photos.slice(1).map((photo: string, idx: number) => (
                <Image key={idx} source={{ uri: photo }} style={styles.secondaryImage} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Button at bottom */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[
            styles.connectButton,
            { backgroundColor: getButtonDisabled() ? colors.textMuted : colors.primary, shadowColor: colors.primary },
            getButtonDisabled() && styles.connectButtonDisabled,
          ]}
          onPress={handleConnect}
          disabled={getButtonDisabled()}
        >
          {isRequesting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              {connection?.status === 'none' && <Sparkles size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
              <Text style={styles.connectButtonText}>{getButtonText()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    // top is set dynamically via insets
    left: spacing.xl,
    zIndex: 100,
  },
  backButtonBg: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: 500,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    ...typography.body,
    color: '#FFF',
    marginLeft: 6,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  // sectionTitle, bioText, tags: use inline style { color: colors.xxx } in JSX
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  bioText: {
    ...typography.body,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tag: {
    backgroundColor: 'rgba(99, 56, 250, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 56, 250, 0.25)',
  },
  tagText: {
    ...typography.caption,
    color: '#6338FA', // brand primary — static, same in both themes
    fontWeight: '600',
  },
  interestTag: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
  interestTagText: {
    ...typography.caption,
    fontWeight: '500',
  },
  morePhotosContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  secondaryImage: {
    width: '100%',
    height: 400,
    borderRadius: 24,
  },
  // bottomBar and connectButton use inline styles with dynamic colors in JSX
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...shadows.md,
  },
  connectButton: {
    height: 56,
    borderRadius: radius.xxl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  connectButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  connectButtonText: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
