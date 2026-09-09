import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { CheckCircle2, Shield, Eye, EyeOff, Sparkles, Filter, Zap, TrendingUp, X, Crown, ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';

export default function PaywallScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'gold'>('premium');

  const handleSubscribe = async (plan: 'premium' | 'gold') => {
    if (!session?.user?.id) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    setLoading(plan);
    try {
      // Atualiza o plano no banco de dados
      const { error } = await supabase
        .from('users')
        .update({ plan: plan })
        .eq('id', session.user.id);

      if (error) throw error;

      Alert.alert(
        'Sucesso!', 
        `Você agora é um assinante ${plan === 'gold' ? 'Gold' : 'Premium'}! 🎉\nObrigado por apoiar a comunidade.`,
        [{ text: 'Começar a aproveitar', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao atualizar assinatura: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escolha seu Plano</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* PREMIUM CARD */}
        <View style={[styles.card, selectedPlan === 'premium' && styles.cardSelected]}>
          {selectedPlan === 'premium' && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.cardHeader} 
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('premium')}
          >
            <View>
              <View style={styles.planTitleRow}>
                <Sparkles size={24} color={colors.primary} />
                <Text style={styles.planTitle}>Premium</Text>
              </View>
              <Text style={styles.planSubtitle}>Maximize suas conexões e viagens</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>R$ 29,90</Text>
              <Text style={styles.priceSubtitle}>/mês</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.featureList}>
            <FeatureItem text="Conexões ilimitadas" />
            <FeatureItem text="Curtir perfis" />
            <FeatureItem text="Conexões prioritárias" />
            <FeatureItem text="Ver quem curtiu você" />
            <FeatureItem text="Modo invisível" />
            <FeatureItem text="5 badges exclusivos Premium" />
            <FeatureItem text="Filtros avançados de viagem" />
            <FeatureItem text="3 boosts por mês" />
            <FeatureItem text="Destaque no feed por 30min/dia" />
            <FeatureItem text="Tradução de IA simultânea no chat" highlight />
          </View>

          <TouchableOpacity 
            style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
            onPress={() => handleSubscribe('premium')}
            disabled={!!loading}
          >
            {loading === 'premium' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.subscribeButtonText}>Assinar Agora</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* GOLD CARD */}
        <View style={[styles.card, styles.goldCard, selectedPlan === 'gold' && styles.goldCardSelected]}>
          <TouchableOpacity 
            style={styles.cardHeader} 
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('gold')}
          >
            <View>
              <View style={styles.planTitleRow}>
                <Crown size={24} color="#F59E0B" />
                <Text style={styles.planTitle}>Gold</Text>
              </View>
              <Text style={styles.planSubtitle}>A experiência completa para viajantes frequentes</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>R$ 49,90</Text>
              <Text style={styles.priceSubtitle}>/mês</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.featureList}>
            <FeatureItem text="Conexões ilimitadas + Super Likes" gold />
            <FeatureItem text="Curtir perfis" gold />
            <FeatureItem text="Conexões prioritárias VIP" gold />
            <FeatureItem text="Ver quem curtiu + visitou seu perfil" gold />
            <FeatureItem text="Modo invisível" gold />
            <FeatureItem text="Todos os badges exclusivos" gold />
            <FeatureItem text="Filtros avançados + IA de conexões" gold />
            <FeatureItem text="10 boosts por mês" gold />
            <FeatureItem text="Destaque permanente no feed" gold />
            <FeatureItem text="Tradução de IA simultânea ilimitada" highlight gold />
          </View>

          <TouchableOpacity 
            style={[styles.subscribeButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => handleSubscribe('gold')}
            disabled={!!loading}
          >
            {loading === 'gold' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.subscribeButtonText}>Selecionar Plano</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* GUARANTEE */}
        <View style={styles.guaranteeContainer}>
          <View style={styles.guaranteeHeader}>
            <Sparkles size={16} color="#F59E0B" />
            <Text style={styles.guaranteeTitle}>Garantia de 7 dias</Text>
          </View>
          <Text style={styles.guaranteeText}>
            Não ficou satisfeito? Cancele dentro de 7 dias e receba reembolso total. Sem perguntas, sem complicações.
          </Text>
        </View>

        {/* FAQ */}
        <Text style={styles.faqTitle}>Perguntas Frequentes</Text>
        <FaqItem question="Posso cancelar a qualquer momento?" />
        <FaqItem question="Os badges ficam para sempre?" />
        <FaqItem question="Como funcionam os boosts?" />

      </ScrollView>
    </View>
  );
}

function FeatureItem({ text, highlight = false, gold = false }: { text: string, highlight?: boolean, gold?: boolean }) {
  return (
    <View style={styles.featureItem}>
      <CheckCircle2 size={20} color={gold ? '#F59E0B' : '#28A745'} />
      <Text style={[styles.featureText, highlight && styles.featureTextHighlight]}>{text}</Text>
    </View>
  );
}

function FaqItem({ question }: { question: string }) {
  return (
    <TouchableOpacity style={styles.faqItem}>
      <ChevronRight size={20} color={colors.textPrimary} />
      <Text style={styles.faqText}>{question}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  goldCard: {
    backgroundColor: '#FFF9F0', // Levemente amarelado
  },
  goldCardSelected: {
    borderColor: '#F59E0B',
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 16,
    zIndex: 10,
  },
  popularBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  planSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    maxWidth: 180,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  priceSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  featureList: {
    gap: 12,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    ...typography.body,
    color: '#333',
    flex: 1,
  },
  featureTextHighlight: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guaranteeContainer: {
    backgroundColor: '#F0F6FF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#D0E2FF',
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  guaranteeText: {
    fontSize: 14,
    color: '#3B82F6',
    lineHeight: 20,
  },
  faqTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  }
});
