import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import { X, MapPin, Calendar, Clock, UserCheck, Check, X as XIcon } from 'lucide-react-native';
import { AVAILABLE_EVENT_ICONS } from './CreateEventModal';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../theme';
import { useRequestJoinEvent, useEventRequests, useUpdateEventRequest, useUserEventRequestStatus } from '../hooks/useEvents';

interface EventDetailsModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  currentUserId: string | null;
}

export default function EventDetailsModal({ visible, event, onClose, currentUserId }: EventDetailsModalProps) {
  const isOwner = event ? currentUserId === event.user_id : false;
  const [activeTab, setActiveTab] = useState<'details' | 'requests'>('details');

  const { data: requests, isLoading: isLoadingRequests } = useEventRequests(isOwner && event ? event.id : null);
  const { mutate: requestJoin, isPending: isRequesting } = useRequestJoinEvent();
  const { data: userRequestStatus, isLoading: isLoadingStatus } = useUserEventRequestStatus(event?.id ?? null);
  const { mutate: updateRequest } = useUpdateEventRequest();

  // Reset tab when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab('details');
    }
  }, [visible]);

  const iconObj = event ? AVAILABLE_EVENT_ICONS.find(i => i.id === event.icon) : null;
  const IconComp = iconObj?.component;

  if (!event) return null;

  const handleJoin = () => {
    if (!event.id) return;
    requestJoin({ eventId: event.id });
  };

  const handleAccept = (requestId: string) => {
    updateRequest({ requestId, status: 'accepted' });
  };

  const handleReject = (requestId: string) => {
    updateRequest({ requestId, status: 'rejected' });
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString();
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80';
  const ownerAvatar = event.users?.photos?.[0] || defaultAvatar;

  const renderRequest = ({ item }: { item: any }) => {
    const avatar = item.users?.photos?.[0] || defaultAvatar;
    return (
      <View style={styles.requestCard}>
        <Image source={{ uri: avatar }} style={styles.requestAvatar} />
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.users?.name || 'Viajante'}</Text>
          <Text style={styles.requestStatus}>Status: {
            item.status === 'pending' ? 'Pendente' : 
            item.status === 'accepted' ? 'Aceito' : 'Recusado'
          }</Text>
        </View>
        {item.status === 'pending' && (
          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.actionBtnReject} onPress={() => handleReject(item.id)}>
              <XIcon size={16} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnAccept} onPress={() => handleAccept(item.id)}>
              <Check size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              {IconComp ? (
                <IconComp size={28} color={colors.primary} />
              ) : (
                <Text style={styles.eventIcon}>{event.icon}</Text>
              )}
            </View>
            <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
              <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {isOwner && (
            <View style={styles.tabs}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Detalhes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                onPress={() => setActiveTab('requests')}
              >
                <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                  Pedidos {requests?.filter(r => r.status === 'pending').length ? `(${requests.filter(r => r.status === 'pending').length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'details' ? (
            <View style={styles.tabContent}>
              <View style={styles.ownerRow}>
                <Image source={{ uri: ownerAvatar }} style={styles.ownerAvatar} />
                <View>
                  <Text style={styles.ownerLabel}>Organizado por</Text>
                  <Text style={styles.ownerName}>{event.users?.name || 'Viajante'}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <MapPin size={20} color={colors.primary} />
                  <Text style={styles.infoText}>{event.location_name || 'Localização no Mapa'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={20} color={colors.primary} />
                  <Text style={styles.infoText}>{formatDate(event.start_time)}</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Clock size={20} color={colors.primary} />
                  <Text style={styles.infoText}>{formatTime(event.start_time)} - {formatTime(event.end_time)}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Sobre o Evento</Text>
              <Text style={styles.description}>
                {event.description || 'Nenhuma descrição fornecida.'}
              </Text>

              <View style={{ flex: 1 }} />

              {!isOwner && (
                <View style={styles.footer}>
                  {isLoadingStatus ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : userRequestStatus === 'pending' ? (
                    <View style={styles.statusBadge}>
                      <Clock size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={styles.statusText}>Pedido Pendente</Text>
                    </View>
                  ) : userRequestStatus === 'accepted' ? (
                    <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                      <UserCheck size={20} color="#10B981" style={{ marginRight: 8 }} />
                      <Text style={[styles.statusText, { color: '#047857' }]}>Você está no Evento!</Text>
                      {/* Placeholder for group chat button */}
                    </View>
                  ) : userRequestStatus === 'rejected' ? (
                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                      <XIcon size={20} color="#EF4444" style={{ marginRight: 8 }} />
                      <Text style={[styles.statusText, { color: '#B91C1C' }]}>Pedido Recusado</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.joinButton, isRequesting && { opacity: 0.7 }]} 
                      onPress={handleJoin}
                      disabled={isRequesting}
                    >
                      {isRequesting ? (
                        <ActivityIndicator color={colors.surface} />
                      ) : (
                        <Text style={styles.joinText}>Pedir para Entrar</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.tabContent}>
              {isLoadingRequests ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
              ) : requests && requests.length > 0 ? (
                <FlatList
                  data={requests}
                  renderItem={renderRequest}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Ninguém pediu para entrar ainda.</Text>
                </View>
              )}
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventIcon: {
    fontSize: 28,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  ownerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  ownerName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requestStatus: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtnReject: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnAccept: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
