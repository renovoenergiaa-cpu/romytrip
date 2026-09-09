import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  SafeAreaView, 
  Platform, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, MessageSquare, UserPlus, Users, Sparkles, Mail, ChevronRight } from 'lucide-react-native';
import { spacing, typography, useTheme } from '../src/theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [connectionsEnabled, setConnectionsEnabled] = useState(true);
  const [communityEnabled, setCommunityEnabled] = useState(true);
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const renderToggleItem = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (val: boolean) => void,
    IconComponent: any
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIconContainer}>
        <IconComponent size={20} color={colors.primary} />
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : '#F4F3F4'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner to view pending notifications */}
        <TouchableOpacity 
          style={styles.notificationCenterCard} 
          onPress={() => router.push('/notifications')}
          activeOpacity={0.8}
        >
          <View style={styles.cardLeft}>
            <View style={styles.cardIconBox}>
              <Bell size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Central de Solicitações</Text>
              <Text style={styles.cardSubtitle}>Ver pedidos de conexão recebidos</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Notificações no Celular (Push)</Text>

        {renderToggleItem(
          'Geral / Push',
          'Ativar ou desativar todas as notificações push',
          pushEnabled,
          setPushEnabled,
          Bell
        )}

        {renderToggleItem(
          'Mensagens Diretas',
          'Avisos quando você receber novas mensagens no chat',
          messagesEnabled,
          setMessagesEnabled,
          MessageSquare
        )}

        {renderToggleItem(
          'Solicitações de Conexão',
          'Quando um viajante quiser se conectar com você',
          connectionsEnabled,
          setConnectionsEnabled,
          UserPlus
        )}

        {renderToggleItem(
          'Atividade na Comunidade',
          'Novos tópicos e respostas nos grupos que você participa',
          communityEnabled,
          setCommunityEnabled,
          Users
        )}

        {renderToggleItem(
          'Recomendações e Dicas',
          'Sugestões de viajantes e pontos turísticos no seu destino',
          recommendationsEnabled,
          setRecommendationsEnabled,
          Sparkles
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Comunicações por E-mail</Text>

        {renderToggleItem(
          'Resumo por E-mail',
          'Receber novidades, atualizações de segurança e relatórios',
          emailEnabled,
          setEmailEnabled,
          Mail
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.md : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  notificationCenterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  toggleTitle: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  toggleSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
});
