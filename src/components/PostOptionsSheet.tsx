import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

export interface PostOptionsSheetProps {
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
    user_id?: string;
  } | null;
  onViewInFeed?: (postId: string) => void;
  onEditCaption?: (post: any) => void;
  onDelete?: (postId: string) => Promise<void> | void;
  isOwner?: boolean;
  title?: string;
}

export default function PostOptionsSheet({
  visible,
  onClose,
  post,
  onViewInFeed,
  onEditCaption,
  onDelete,
  isOwner = true,
  title = 'Opções da Publicação',
}: PostOptionsSheetProps) {
  const { colors, isDark } = useTheme();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    setConfirmingDelete(false);
    setIsDeleting(false);
    onClose();
  };

  if (!post) return null;

  const imageUrl = post.media_url || post.image_url || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
  const postCaption = post.description || post.caption || 'Sem descrição';
  const postDestination = post.destination || 'Local registrado';

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await onDelete(post.id);
      handleClose();
    } catch (e) {
      console.warn('Erro ao excluir:', e);
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                  borderColor: isDark ? '#27272A' : '#E4E4E7',
                },
              ]}
            >
              {/* Drag Handle Indicator */}
              <View
                style={[
                  styles.dragHandle,
                  { backgroundColor: isDark ? '#3F3F46' : '#E4E4E7' },
                ]}
              />

              {confirmingDelete ? (
                /* Delete Confirmation State */
                <View style={styles.confirmDeleteContainer}>
                  <View style={styles.deleteWarningIconCircle}>
                    <AlertTriangle size={28} color="#EF4444" strokeWidth={2.2} />
                  </View>
                  <Text
                    style={[
                      styles.confirmDeleteTitle,
                      { color: isDark ? '#FFFFFF' : '#18181B' },
                    ]}
                  >
                    Excluir publicação?
                  </Text>
                  <Text
                    style={[
                      styles.confirmDeleteSubtitle,
                      { color: isDark ? '#A1A1AA' : '#6B7280' },
                    ]}
                  >
                    Esta ação é permanente e não poderá ser desfeita. A publicação será removida do feed e do seu perfil.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.deleteConfirmBtn}
                    onPress={handleDeleteConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Trash2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={styles.deleteConfirmBtnText}>
                          Sim, excluir publicação
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.cancelDeleteBtn,
                      {
                        backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                      },
                    ]}
                    onPress={() => setConfirmingDelete(false)}
                    disabled={isDeleting}
                  >
                    <Text
                      style={[
                        styles.cancelDeleteBtnText,
                        { color: isDark ? '#E4E4E7' : '#3F3F46' },
                      ]}
                    >
                      Não, manter publicação
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Main Options List */
                <>
                  {/* Post Preview Snippet Header */}
                  <View
                    style={[
                      styles.postPreviewRow,
                      {
                        backgroundColor: isDark ? '#27272A' : '#F8F9FA',
                        borderColor: isDark ? '#3F3F46' : '#E5E7EB',
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.previewThumbnail}
                    />
                    <View style={styles.previewMetaCol}>
                      <Text
                        style={[
                          styles.previewTitle,
                          { color: isDark ? '#FFFFFF' : '#111827' },
                        ]}
                        numberOfLines={1}
                      >
                        {postCaption}
                      </Text>
                      <View style={styles.previewLocationRow}>
                        <MapPin
                          size={12}
                          color={isDark ? '#A1A1AA' : '#6B7280'}
                          strokeWidth={2}
                        />
                        <Text
                          style={[
                            styles.previewLocationText,
                            { color: isDark ? '#A1A1AA' : '#6B7280' },
                          ]}
                          numberOfLines={1}
                        >
                          {postDestination}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions List */}
                  <View style={styles.actionsList}>
                    {onViewInFeed && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[
                          styles.actionItem,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
                            borderColor: isDark ? '#27272A' : '#F1F1F4',
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleClose();
                          onViewInFeed(post.id);
                        }}
                      >
                        <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(99, 56, 250, 0.12)' }]}>
                          <Eye size={20} color="#6338FA" strokeWidth={2.2} />
                        </View>
                        <View style={styles.actionTextCol}>
                          <Text
                            style={[
                              styles.actionTitle,
                              { color: isDark ? '#FFFFFF' : '#18181B' },
                            ]}
                          >
                            Ver no Feed
                          </Text>
                          <Text
                            style={[
                              styles.actionSubtitle,
                              { color: isDark ? '#A1A1AA' : '#6B7280' },
                            ]}
                          >
                            Abrir e destacar publicação no feed principal
                          </Text>
                        </View>
                        <ChevronRight
                          size={18}
                          color={isDark ? '#52525B' : '#A1A1AA'}
                        />
                      </TouchableOpacity>
                    )}

                    {isOwner && onEditCaption && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[
                          styles.actionItem,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
                            borderColor: isDark ? '#27272A' : '#F1F1F4',
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleClose();
                          onEditCaption(post);
                        }}
                      >
                        <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                          <Pencil size={19} color="#3B82F6" strokeWidth={2.2} />
                        </View>
                        <View style={styles.actionTextCol}>
                          <Text
                            style={[
                              styles.actionTitle,
                              { color: isDark ? '#FFFFFF' : '#18181B' },
                            ]}
                          >
                            Editar legenda
                          </Text>
                          <Text
                            style={[
                              styles.actionSubtitle,
                              { color: isDark ? '#A1A1AA' : '#6B7280' },
                            ]}
                          >
                            Atualizar a descrição ou detalhes
                          </Text>
                        </View>
                        <ChevronRight
                          size={18}
                          color={isDark ? '#52525B' : '#A1A1AA'}
                        />
                      </TouchableOpacity>
                    )}

                    {isOwner && onDelete && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[
                          styles.actionItem,
                          {
                            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.06)' : 'rgba(239, 68, 68, 0.04)',
                            borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setConfirmingDelete(true);
                        }}
                      >
                        <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                          <Trash2 size={19} color="#EF4444" strokeWidth={2.2} />
                        </View>
                        <View style={styles.actionTextCol}>
                          <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
                            Excluir publicação
                          </Text>
                          <Text
                            style={[
                              styles.actionSubtitle,
                              { color: isDark ? '#F87171' : '#DC2626' },
                            ]}
                          >
                            Remover definitivamente do perfil e do feed
                          </Text>
                        </View>
                        <ChevronRight
                          size={18}
                          color={isDark ? '#7F1D1D' : '#FCA5A5'}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Cancel Pill Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor: isDark ? '#27272A' : '#F4F4F5',
                        borderColor: isDark ? '#3F3F46' : '#E4E4E7',
                      },
                    ]}
                    onPress={handleClose}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: isDark ? '#E4E4E7' : '#3F3F46' },
                      ]}
                    >
                      Fechar
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 42,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  postPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    gap: 12,
  },
  previewThumbnail: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  previewMetaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  previewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewLocationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsList: {
    gap: 10,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  actionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  cancelButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmDeleteContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteWarningIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmDeleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmDeleteSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  deleteConfirmBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  deleteConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelDeleteBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelDeleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
