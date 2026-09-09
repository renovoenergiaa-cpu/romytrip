import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView, 
  Platform, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  HelpCircle, 
  MessageSquare, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  X, 
  FileText, 
  LifeBuoy, 
  Sparkles 
} from 'lucide-react-native';
import { spacing, typography, useTheme } from '../src/theme';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: '1',
    question: 'Como funciona a conexão entre viajantes?',
    answer: 'Na aba Conexões, você pode explorar perfis de pessoas com itinerários e interesses semelhantes aos seus. Ao enviar uma solicitação e ser aceito, vocês poderão conversar no chat privado.',
  },
  {
    id: '2',
    question: 'Como funciona o Quadro de Ajuda da Comunidade?',
    answer: 'O Quadro de Ajuda permite postar dúvidas rápidas como dicas de restaurantes, câmbio, transporte ou farmácias no local onde você está. Outros viajantes na mesma região podem responder suas perguntas em tempo real.',
  },
  {
    id: '3',
    question: 'Como posso participar ou criar Comunidades?',
    answer: 'Acesse a aba Comunidades. Lá você encontra grupos focados por destino (ex: Japão, Europa, América Latina) ou por estilo de viagem (Mochilão, Gastronomia, Trabalho Remoto). Você pode entrar ou criar um novo grupo.',
  },
  {
    id: '4',
    question: 'É seguro encontrar pessoas através do app?',
    answer: 'Recomendamos sempre marcar encontros em locais públicos e bem movimentados (cafés, praças, recepções de hostel). Verifique o perfil, biografia e badges de verificação de outros membros antes de se encontrar.',
  },
  {
    id: '5',
    question: 'Como alterar meu nome ou foto de perfil?',
    answer: 'Em Configurações, clique em "Editar Perfil". Lá você poderá atualizar sua foto, nome, cidade de origem, destino atual e sua biografia.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const toggleFAQ = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSendContact = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Atenção', 'Preencha o assunto e a mensagem antes de enviar.');
      return;
    }

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setContactModalVisible(false);
      setSubject('');
      setMessage('');
      Alert.alert(
        'Mensagem Enviada',
        'Recebemos sua mensagem! Nossa equipe de suporte responderá em até 24 horas no seu e-mail.'
      );
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajuda e Suporte</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick action: Community help board */}
        <TouchableOpacity 
          style={styles.helpBoardCard} 
          onPress={() => router.push('/help-board')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <LifeBuoy size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Quadro de Ajuda da Comunidade</Text>
              <Text style={styles.cardSubtitle}>Precisa de dicas rápidas no seu destino? Pergunte a outros viajantes!</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>Perguntas Frequentes (FAQ)</Text>
        
        {FAQ_LIST.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <View key={item.id} style={styles.faqCard}>
              <TouchableOpacity 
                style={styles.faqHeader} 
                onPress={() => toggleFAQ(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.primary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.faqBody}>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.divider} />

        {/* Contact Support */}
        <Text style={styles.sectionTitle}>Ainda precisa de ajuda?</Text>

        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => setContactModalVisible(true)}
          activeOpacity={0.8}
        >
          <MessageSquare size={20} color="#FFF" style={{ marginRight: spacing.sm }} />
          <Text style={styles.contactButtonText}>Falar com a Equipe de Suporte</Text>
        </TouchableOpacity>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>Romy App v1.0.0 — Conectando Viajantes pelo Mundo</Text>
        </View>
      </ScrollView>

      {/* Contact Support Modal */}
      <Modal visible={contactModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar Mensagem</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Assunto</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Dúvida sobre perfil, erro no app..."
                placeholderTextColor={colors.textMuted}
                value={subject}
                onChangeText={setSubject}
              />

              <Text style={styles.inputLabel}>Mensagem</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Descreva detalhadamente como podemos te ajudar..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={message}
                onChangeText={setMessage}
              />

              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleSendContact}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Send size={18} color="#FFF" style={{ marginRight: spacing.xs }} />
                    <Text style={styles.sendButtonText}>Enviar Mensagem</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  helpBoardCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  faqQuestion: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  faqBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  faqAnswer: {
    ...typography.caption,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  contactButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.xl,
  },
  contactButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.textPrimary,
  },
  modalForm: {
    gap: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 110,
  },
  sendButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
