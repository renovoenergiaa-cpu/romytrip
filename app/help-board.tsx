import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/ui/Text';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useHelpRequests, useCreateHelpRequest, useResolveHelpRequest, useHelpReplies, useCreateHelpReply, useDeleteHelpRequest,
} from '../src/hooks/useDiscovery';
import { useCurrentUserId } from '../src/hooks/useMessenger';
import { useTheme, type ThemeColors } from '../src/theme';
import { Sheet } from '../src/components/Sheet';
import { confirmAction, showError } from '../src/lib/dialogs';
import { Avatar } from '../src/features/onboarding/components';
import { ChatEmpty, FilterChip } from '../src/features/chat/components';
import { timeAgo } from '../src/features/feed/format';
import {
  Bell, CaretLeft, Car, Check, ChatCircleDots, CreditCard, ForkKnife, HandHeart, MapPin, PaperPlaneTilt, Pill, Plus, Trash, WifiSlash, type Icon,
} from '../src/features/onboarding/icons';

// O valor da categoria é gravado no banco (help_requests.category): NÃO alterar os nomes
type Category = 'Restaurante' | 'Farmácia' | 'Transporte' | 'Câmbio/ATM' | 'Outros';
const CATEGORIES: { value: Category; label: string; icon: Icon }[] = [
  { value: 'Restaurante', label: 'Restaurante', icon: ForkKnife },
  { value: 'Farmácia', label: 'Farmácia', icon: Pill },
  { value: 'Transporte', label: 'Transporte', icon: Car },
  { value: 'Câmbio/ATM', label: 'Câmbio e caixa eletrônico', icon: CreditCard },
  { value: 'Outros', label: 'Outros', icon: Bell },
];
const categoryOf = (value?: string) => CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];

const tone = (c: ThemeColors, value?: string) =>
  value === 'Restaurante' ? c.warning : value === 'Farmácia' ? c.error : value === 'Transporte' ? c.success : value === 'Câmbio/ATM' ? c.info : c.textSecondary;

const soft = (hex: string, alpha = 0.14) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

type StatusFilter = 'all' | 'active' | 'resolved';
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Ativas' },
  { id: 'resolved', label: 'Resolvidas' },
];

const nameOf = (u?: { name?: string | null } | null) => String(u?.name ?? '').trim() || 'Viajante';

// `city` é a cidade da pessoa: filtra os pedidos e vai gravada no pedido novo
export default function HelpBoardScreen({ isEmbedded, city }: { isEmbedded?: boolean; city?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const currentUserId = useCurrentUserId();
  const cityShort = city ? city.split(',')[0].trim() : '';

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [category, setCategory] = useState<Category>('Restaurante');
  const [content, setContent] = useState('');
  const [reply, setReply] = useState('');

  const { data: helps, isLoading, isError, refetch } = useHelpRequests(filter, cityShort || undefined);
  const { mutate: createHelp, isPending: creating } = useCreateHelpRequest();
  const { mutate: resolveHelp } = useResolveHelpRequest();
  const { mutate: deleteHelp } = useDeleteHelpRequest();
  const { mutate: createReply, isPending: replying } = useCreateHelpReply();
  const { data: replies, isLoading: loadingReplies } = useHelpReplies(selected?.id ?? '');

  const tick = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

  const publish = () => {
    if (!content.trim()) return;
    createHelp(
      // Sem a cidade conhecida o pedido fica sem lugar (nunca mais "Local Atual")
      { category, content: content.trim(), city: cityShort },
      {
        onSuccess: () => { setCreateOpen(false); setContent(''); },
        onError: () => showError('Não foi possível publicar', 'Confira sua conexão e tente de novo.'),
      },
    );
  };

  const resolve = (id: string, then?: () => void) =>
    resolveHelp({ requestId: id, status: 'resolved' }, { onSuccess: then, onError: () => showError('Não foi possível resolver', 'Tente de novo em instantes.') });

  const remove = async (id: string) => {
    const ok = await confirmAction({ title: 'Excluir pedido?', message: 'O pedido e as respostas somem para todo mundo.', confirmLabel: 'Excluir', destructive: true });
    if (!ok) return;
    deleteHelp(id, { onSuccess: () => setSelected(null), onError: () => showError('Não foi possível excluir', 'Tente de novo em instantes.') });
  };

  const sendReply = () => {
    if (!reply.trim() || !selected) return;
    createReply({ requestId: selected.id, content: reply.trim() }, {
      onSuccess: () => setReply(''),
      onError: () => showError('Não foi possível responder', 'Tente de novo em instantes.'),
    });
  };

  const isMine = (h: any) => !!currentUserId && currentUserId === h.user_id;

  return (
    <View style={s.root}>
      {!isEmbedded && (
        <View style={[s.standalone, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar" style={s.back}>
            <CaretLeft size={22} weight="bold" color={colors.textPrimary} />
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Text style={s.title} accessibilityRole="header">Ajudinha</Text>
            <Text style={s.sub}>{cityShort ? `Pedidos de viajantes em ${cityShort}` : 'Peça ou ofereça ajuda a outros viajantes'}</Text>
          </View>
          <Pressable onPress={() => { tick(); setCreateOpen(true); }} accessibilityRole="button" accessibilityLabel="Pedir ajuda" style={({ pressed }) => [s.ask, pressed && s.pressed]}>
            <Plus size={18} weight="bold" color={colors.onPrimary} />
            <Text style={s.askText}>Pedir ajuda</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityRole="tablist">
          {FILTERS.map((f) => <FilterChip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />)}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} accessibilityLabel="Carregando pedidos" />
        ) : isError && !helps ? (
          <ChatEmpty icon={WifiSlash} title="Não conseguimos carregar" text="Confira sua internet e tente de novo." action="Tentar de novo" onAction={() => refetch()} secondary />
        ) : helps && helps.length > 0 ? (
          <View style={{ gap: 12 }}>
            {helps.map((help: any) => {
              const cat = categoryOf(help.category);
              const color = tone(colors, help.category);
              const resolved = help.status === 'resolved';
              const author = nameOf(help.users);
              return (
                <Pressable key={help.id} onPress={() => { tick(); setSelected(help); }} accessibilityRole="button" accessibilityLabel={`Pedido de ${author}: ${help.content}`} style={({ pressed }) => [s.card, resolved && { opacity: 0.7 }, pressed && s.pressed]}>
                  <View style={s.cardTop}>
                    <View style={[s.tag, { backgroundColor: soft(color) }]}>
                      <cat.icon size={14} weight="duotone" color={color} />
                      <Text style={[s.tagText, { color }]}>{cat.label}</Text>
                    </View>
                    <View style={[s.status, { backgroundColor: resolved ? colors.successSoft : colors.primarySoft }]}>
                      {resolved ? <Check size={12} weight="bold" color={colors.success} /> : null}
                      <Text style={[s.statusText, { color: resolved ? colors.success : colors.primary }]}>{resolved ? 'Resolvido' : 'Ativo'}</Text>
                    </View>
                  </View>
                  <Text style={s.content} numberOfLines={3}>{help.content}</Text>
                  <View style={s.foot}>
                    <Avatar photo={help.users?.photos?.[0]} name={author} size={24} />
                    <Text style={s.footText} numberOfLines={1}>{author}</Text>
                    {help.city ? <><MapPin size={14} weight="fill" color={colors.textMuted} /><Text style={s.footText} numberOfLines={1}>{help.city}</Text></> : null}
                    {help.created_at ? <Text style={[s.footText, { marginLeft: 'auto' }]}>{timeAgo(help.created_at)}</Text> : null}
                  </View>
                  {!resolved && isMine(help) ? (
                    <Pressable onPress={() => resolve(help.id)} accessibilityRole="button" style={({ pressed }) => [s.resolveBtn, pressed && s.pressed]}>
                      <Check size={16} weight="bold" color={colors.success} /><Text style={s.resolveText}>Marcar como resolvido</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ChatEmpty
            icon={HandHeart}
            title={filter === 'resolved' ? 'Nenhum pedido resolvido' : 'Nenhum pedido por aqui'}
            text={filter === 'resolved' ? 'Os pedidos que forem resolvidos aparecem nesta lista.' : cityShort ? `Ninguém pediu ajuda em ${cityShort} ainda. Precisando de algo, é só perguntar.` : 'Ninguém pediu ajuda ainda. Precisando de algo, é só perguntar.'}
            action={filter === 'resolved' ? undefined : 'Pedir ajuda'}
            onAction={() => setCreateOpen(true)}
          />
        )}
      </ScrollView>

      {/* Novo pedido */}
      <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="Pedir ajuda" fill>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 12 }}>
          <View style={s.field}>
            <Text style={s.label}>Sobre o quê?</Text>
            <View style={s.cats}>
              {CATEGORIES.map((c) => {
                const on = category === c.value;
                const color = tone(colors, c.value);
                return (
                  <Pressable key={c.value} onPress={() => { tick(); setCategory(c.value); }} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[s.cat, on && { borderColor: color, backgroundColor: soft(color) }]}>
                    <c.icon size={20} weight={on ? 'fill' : 'duotone'} color={on ? color : colors.textSecondary} />
                    <Text style={[s.catText, on && { color, fontWeight: '800' }]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Sua pergunta</Text>
            <TextInput value={content} onChangeText={setContent} placeholder="Ex.: onde tem farmácia aberta de madrugada por aqui?" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} multiline maxLength={400} accessibilityLabel="Sua pergunta" style={s.textArea} />
            <Text style={s.hint}>{cityShort ? `O pedido aparece para quem está em ${cityShort}.` : 'Não sabemos sua cidade (localização desligada); o pedido aparece para todo mundo.'}</Text>
          </View>
        </ScrollView>
        <Pressable onPress={publish} disabled={!content.trim() || creating} accessibilityRole="button" style={({ pressed }) => [s.cta, (!content.trim() || creating) && s.ctaOff, pressed && s.pressed]}>
          {creating ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[s.ctaText, !content.trim() && { color: colors.textMuted }]}>Publicar pedido</Text>}
        </Pressable>
      </Sheet>

      {/* Detalhes e respostas */}
      <Sheet visible={!!selected} onClose={() => { setSelected(null); setReply(''); }} title="Pedido de ajuda" fill>
        {selected ? (
          <>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
              <View style={s.author}>
                <Avatar photo={selected.users?.photos?.[0]} name={nameOf(selected.users)} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.authorName}>{nameOf(selected.users)}</Text>
                  {selected.city ? <View style={s.metaRow}><MapPin size={14} weight="fill" color={colors.textMuted} /><Text style={s.footText}>{selected.city}</Text></View> : null}
                </View>
              </View>
              <Text style={s.detail} selectable>{selected.content}</Text>

              {isMine(selected) ? (
                <View style={s.owner}>
                  {selected.status !== 'resolved' ? (
                    <Pressable onPress={() => resolve(selected.id, () => setSelected(null))} accessibilityRole="button" style={[s.ownerBtn, { backgroundColor: colors.successSoft }]}>
                      <Check size={18} weight="bold" color={colors.success} /><Text style={[s.ownerText, { color: colors.success }]}>Resolvido</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => remove(selected.id)} accessibilityRole="button" style={[s.ownerBtn, { backgroundColor: colors.errorSoft }]}>
                    <Trash size={18} weight="bold" color={colors.error} /><Text style={[s.ownerText, { color: colors.error }]}>Excluir</Text>
                  </Pressable>
                </View>
              ) : null}

              <Text style={s.repliesTitle}>Respostas</Text>
              {loadingReplies ? (
                <ActivityIndicator color={colors.primary} />
              ) : replies && replies.length > 0 ? (
                replies.map((r: any) => (
                  <View key={r.id} style={s.reply}>
                    <Avatar photo={r.users?.photos?.[0]} name={nameOf(r.users)} size={32} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.replyName}>{nameOf(r.users)}{r.created_at ? <Text style={s.replyWhen}>{`  ${timeAgo(r.created_at)}`}</Text> : null}</Text>
                      <Text style={s.replyText} selectable>{r.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={s.noReplies}><ChatCircleDots size={28} weight="duotone" color={colors.textMuted} /><Text style={s.hint}>Ninguém respondeu ainda. Sabe a resposta? Ajude!</Text></View>
              )}
            </ScrollView>

            <View style={s.replyBar}>
              <TextInput value={reply} onChangeText={setReply} placeholder="Escreva uma resposta" placeholderTextColor={colors.textMuted} selectionColor={colors.primary} maxLength={400} returnKeyType="send" onSubmitEditing={sendReply} accessibilityLabel="Escreva uma resposta" style={s.replyInput} />
              <Pressable onPress={sendReply} disabled={!reply.trim() || replying} accessibilityRole="button" accessibilityLabel="Enviar resposta" style={[s.send, (!reply.trim() || replying) && { opacity: 0.45 }]}>
                {replying ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <PaperPlaneTilt size={22} weight="fill" color={colors.onPrimary} />}
              </Pressable>
            </View>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  pressed: { transform: [{ scale: 0.98 }] },
  standalone: { paddingHorizontal: 20, paddingBottom: 4 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 30, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8 },
  sub: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
  ask: { height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
  askText: { fontSize: 14, fontWeight: '700', color: c.onPrimary },
  chips: { gap: 8, paddingRight: 20 },

  card: { padding: 14, gap: 10, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, flexShrink: 1 },
  tagText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 10, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '800' },
  content: { fontSize: 16, lineHeight: 23, color: c.textPrimary },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footText: { fontSize: 13, color: c.textSecondary, flexShrink: 1 },
  resolveBtn: { height: 42, borderRadius: 14, backgroundColor: c.successSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  resolveText: { fontSize: 14, fontWeight: '700', color: c.success },

  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1.5, borderColor: 'transparent' },
  catText: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  textArea: { minHeight: 110, maxHeight: 200, borderRadius: 16, padding: 14, fontSize: 16, lineHeight: 22, textAlignVertical: 'top', color: c.textPrimary, backgroundColor: c.surface, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  cta: { height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaOff: { backgroundColor: c.surface },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },

  author: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorName: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  detail: { fontSize: 17, lineHeight: 25, color: c.textPrimary },
  owner: { flexDirection: 'row', gap: 10 },
  ownerBtn: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ownerText: { fontSize: 15, fontWeight: '700' },
  repliesTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary, marginTop: 6 },
  reply: { flexDirection: 'row', gap: 10 },
  replyName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  replyWhen: { fontSize: 13, fontWeight: '400', color: c.textMuted },
  replyText: { fontSize: 15, lineHeight: 21, color: c.textPrimary, marginTop: 1 },
  noReplies: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  replyInput: { flex: 1, minWidth: 0, height: 46, borderRadius: 23, paddingHorizontal: 18, fontSize: 16, color: c.textPrimary, backgroundColor: c.surface, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
});
