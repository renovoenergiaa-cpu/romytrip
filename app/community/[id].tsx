import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCommunity, useCommunityMembers, useCommunityPosts, useJoinCommunity, useCreateCommunityPost, useDeleteCommunity, useUpdateCommunityIcon, useUpdateCommunityCover, useDeleteCommunityPost } from '../../src/hooks/useCommunities';
import { useCurrentUserId } from '../../src/hooks/useMessenger';
import { spacing, typography, useTheme } from '../../src/theme';
import { ChevronLeft, MessageCircle, Image as ImageIcon, Send, Users, Globe, Lock, Clock, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const { data: community, isLoading: isCommLoading } = useCommunity(id);
  const { data: memberData, isLoading: isMembersLoading } = useCommunityMembers(id);
  const { data: posts, isLoading: isPostsLoading } = useCommunityPosts(id);
  const { mutate: joinCommunity, isPending: isJoining } = useJoinCommunity();
  const { mutate: createPost, isPending: isPosting } = useCreateCommunityPost();
  const { mutate: deleteCommunity, isPending: isDeleting } = useDeleteCommunity();
  const { mutate: updateCommunityIcon, isPending: isUpdatingIcon } = useUpdateCommunityIcon();
  const { mutate: updateCommunityCover, isPending: isUpdatingCover } = useUpdateCommunityCover();
  const { mutate: deletePost, isPending: isDeletingPost } = useDeleteCommunityPost();

  const [newPostText, setNewPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localIcon, setLocalIcon] = useState<string | null>(null);
  const [localCover, setLocalCover] = useState<string | null>(null);

  const isMember = (memberData as any)?.isMember;
  const members = (memberData as any)?.members || [];
  const isCreator = community?.created_by === currentUserId;

  const handleDeleteCommunity = () => {
    Alert.alert(
      'Excluir Comunidade',
      'Tem certeza que deseja apagar esta comunidade? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: () => {
            deleteCommunity({ communityId: id }, {
              onSuccess: () => {
                Alert.alert('Sucesso', 'Comunidade excluída.');
                router.replace('/(tabs)/communities');
              },
              onError: (err) => {
                Alert.alert('Erro', 'Não foi possível excluir. Apenas o criador pode fazer isso.');
              }
            });
          }
        }
      ]
    );
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      'Excluir Publicação',
      'Tem certeza que deseja apagar esta publicação? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: () => {
            deletePost({ postId }, {
              onSuccess: () => {
                Alert.alert('Sucesso', 'Publicação excluída.');
              },
              onError: (err) => {
                Alert.alert('Erro', 'Não foi possível excluir a publicação.');
              }
            });
          }
        }
      ]
    );
  };

  const handleJoin = () => {
    if (!community) return;
    joinCommunity({ communityId: id, groupChatId: community.group_chat_id });
  };

  const handleUpdateGroupIcon = async () => {
    if (!isCreator || isUpdatingIcon) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1], // Square for icon
    });
    if (!result.canceled) {
      setLocalIcon(result.assets[0].uri);
      updateCommunityIcon({ communityId: id, mediaUri: result.assets[0].uri }, {
        onSuccess: () => {
          Alert.alert('Sucesso', 'Ícone do grupo atualizado!');
        },
        onError: (err) => {
          setLocalIcon(null);
          Alert.alert('Erro', 'Falha ao atualizar o ícone: ' + err.message);
        }
      });
    }
  };

  const handleUpdateGroupCover = async () => {
    if (!isCreator || isUpdatingCover) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [16, 9], // Widescreen for cover
    });
    if (!result.canceled) {
      setLocalCover(result.assets[0].uri);
      updateCommunityCover({ communityId: id, mediaUri: result.assets[0].uri }, {
        onSuccess: () => {
          Alert.alert('Sucesso', 'Capa do grupo atualizada!');
        },
        onError: (err) => {
          setLocalCover(null);
          Alert.alert('Erro', 'Falha ao atualizar a capa: ' + err.message);
        }
      });
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível acessar a galeria: ' + (err?.message || err));
    }
  };

  const handlePost = () => {
    if (!newPostText.trim() && !selectedImage) return;
    createPost({
      communityId: id,
      content: newPostText,
      mediaUri: selectedImage || undefined,
    }, {
      onSuccess: () => {
        setNewPostText('');
        setSelectedImage(null);
      },
      onError: (err) => {
        Alert.alert('Erro', 'Não foi possível enviar o post.');
      }
    });
  };

  if (isCommLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!community) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#FFF' }}>Comunidade não encontrada.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community.title}</Text>
        {isCreator ? (
          <TouchableOpacity onPress={handleDeleteCommunity} style={styles.backButton} disabled={isDeleting}>
            {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Trash2 size={24} color="#EF4444" />}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Cover Area */}
        <ImageBackground 
          source={(localCover || community.cover_url) ? { uri: localCover || community.cover_url } : undefined}
          style={[styles.coverPhoto, !(localCover || community.cover_url) && { backgroundColor: community.bg_color || '#F3E8FF' }]}
        >
          {isCreator && (
            <TouchableOpacity 
              style={styles.editCoverBtn} 
              onPress={handleUpdateGroupCover}
              disabled={isUpdatingCover}
            >
              {isUpdatingCover ? <ActivityIndicator size="small" color="#FFF" /> : <ImageIcon size={20} color="#FFF" />}
            </TouchableOpacity>
          )}

          {/* GROUP ICON */}
          <TouchableOpacity 
            style={styles.groupIconContainer}
            disabled={!isCreator || isUpdatingIcon}
            onPress={handleUpdateGroupIcon}
          >
            {isUpdatingIcon ? (
              <View style={[styles.groupIcon, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (localIcon || community.icon_url) ? (
              <Image source={{ uri: localIcon || community.icon_url }} style={styles.groupIcon} />
            ) : (
              <View style={[styles.groupIcon, { backgroundColor: community.color || '#A855F7', justifyContent: 'center', alignItems: 'center' }]}>
                <Users size={32} color="#FFF" />
              </View>
            )}
            {isCreator && (
              <View style={styles.editIconBadge}>
                <ImageIcon size={12} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.typeTag}>
            {community.type === 'Temporária' ? (
              <Clock size={16} color={community.color || '#A855F7'} />
            ) : community.type === 'Internacional' ? (
              <Globe size={16} color={community.color || '#3B82F6'} />
            ) : community.type === 'Privada' ? (
              <Lock size={16} color={community.color || '#F59E0B'} />
            ) : (
              <Users size={16} color={community.color || '#10B981'} />
            )}
            <Text style={[styles.typeText, { color: community.color || '#A855F7' }]}>{community.type}</Text>
          </View>
        </ImageBackground>

        {/* Info Area */}
        <View style={styles.infoArea}>
          {community.description ? (
            <Text style={styles.description}>{community.description}</Text>
          ) : null}
          
          <View style={styles.statsRow}>
            <Users size={16} color="#A1A1AA" />
            <Text style={styles.statsText}>{community.community_members?.[0]?.count || members.length} Membros</Text>
          </View>

          <View style={styles.actionRow}>
            {isMember ? (
              <TouchableOpacity 
                style={styles.chatBtn} 
                onPress={() => router.push(`/chat/${community.group_chat_id}`)}
              >
                <MessageCircle size={20} color="#FFF" />
                <Text style={styles.chatBtnText}>Chat do Grupo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.joinBtn} 
                onPress={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.joinBtnText}>Entrar na Comunidade</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Post Input */}
        {isMember && (
          <View style={styles.postInputArea}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="O que você quer compartilhar?"
                placeholderTextColor="#A1A1AA"
                multiline
                value={newPostText}
                onChangeText={setNewPostText}
              />
            </View>
            
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}

            <View style={styles.inputActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handlePickImage}>
                <ImageIcon size={24} color={colors.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.sendBtn, (!newPostText.trim() && !selectedImage) && { opacity: 0.5 }]} 
                onPress={handlePost}
                disabled={(!newPostText.trim() && !selectedImage) || isPosting}
              >
                {isPosting ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={18} color="#FFF" />}
                <Text style={styles.sendBtnText}>Publicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Feed */}
        <View style={styles.feedArea}>
          <Text style={styles.feedTitle}>Feed do Grupo</Text>
          
          {isPostsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : posts && posts.length > 0 ? (
            posts.map(post => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Image 
                    source={{ uri: post.users?.photos?.[0] || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100' }} 
                    style={styles.postAvatar} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postAuthor}>{post.users?.name || 'Viajante'}</Text>
                    <Text style={styles.postTime}>{new Date(post.created_at).toLocaleString()}</Text>
                  </View>
                  {(post.user_id === currentUserId || isCreator) && (
                    <TouchableOpacity onPress={() => handleDeletePost(post.id)} style={{ padding: 4 }} disabled={isDeletingPost}>
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
                
                {post.media_url ? (
                  <Image source={{ uri: post.media_url }} style={styles.postImage} resizeMode="cover" />
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyFeedText}>Nenhuma postagem ainda.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.sm : spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  coverPhoto: {
    height: 160,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  editCoverBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  groupIconContainer: {
    position: 'relative',
    marginTop: spacing.md,
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.background,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  infoArea: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '800',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  statsText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
  },
  joinBtn: {
    flex: 1,
    backgroundColor: '#A855F7',
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  joinBtnText: {
    ...typography.body,
    color: '#FFF',
    fontWeight: 'bold',
  },
  chatBtn: {
    flex: 1,
    backgroundColor: '#2563EB', // Messenger Blue
    paddingVertical: spacing.md,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatBtnText: {
    ...typography.body,
    color: '#FFF',
    fontWeight: 'bold',
  },
  postInputArea: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 20,
    marginHorizontal: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    ...typography.body,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  sendBtn: {
    backgroundColor: '#A855F7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  sendBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  feedArea: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  feedTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    fontWeight: 'bold',
  },
  postCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 20,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  postAuthor: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  postTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  postContent: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  emptyFeed: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyFeedText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
