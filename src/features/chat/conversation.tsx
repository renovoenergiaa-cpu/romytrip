import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image as ExpoImage } from 'expo-image';
import { resolveChatMediaUrl, useChatMediaUrl } from '../../hooks/useChatMedia';
import { useTheme, type ThemeColors } from '../../theme';
import { showError } from '../../lib/dialogs';
import {
  Camera, CaretLeft, DotsThreeVertical, ImageSquare, LockSimple, Microphone, PaperPlaneTilt, Pause, Phone,
  Play, Trash, Translate, VideoCamera, X,
} from '../onboarding/icons';
import { ChatAvatar, type describeConversation } from './components';
import { clockTime } from './format';

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/* ─── Cabeçalho ────────────────────────────────────────────────────────────── */

export function ConversationHeader({ who, subtitle, onBack, onCall, onVideo, onMore }: {
  who: ReturnType<typeof describeConversation>;
  subtitle?: string;
  onBack: () => void;
  /** Sem chamadas (ex.: no web, que não suporta áudio/vídeo ao vivo). */
  onCall?: () => void;
  onVideo?: () => void;
  onMore?: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => headerStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} hitSlop={6} accessibilityRole="button" accessibilityLabel="Voltar" style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}>
        <CaretLeft size={24} weight="bold" color={colors.textPrimary} />
      </Pressable>

      <ChatAvatar kind={who.kind} name={who.name} photo={who.photo} size={44} colors={colors} />
      <View style={s.titles}>
        <Text style={s.name} numberOfLines={1} accessibilityRole="header">{who.name}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {onCall && (
        <Pressable onPress={onCall} accessibilityRole="button" accessibilityLabel="Chamada de voz" style={({ pressed }) => [s.actionBtn, pressed && s.pressed]}>
          <Phone size={22} weight="duotone" color={colors.primary} />
        </Pressable>
      )}
      {onVideo && (
        <Pressable onPress={onVideo} accessibilityRole="button" accessibilityLabel="Chamada de vídeo" style={({ pressed }) => [s.actionBtn, pressed && s.pressed]}>
          <VideoCamera size={22} weight="duotone" color={colors.primary} />
        </Pressable>
      )}
      {onMore && (
        <Pressable onPress={onMore} hitSlop={6} accessibilityRole="button" accessibilityLabel="Mais opções" style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}>
          <DotsThreeVertical size={24} weight="bold" color={colors.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const headerStyles = (c: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: c.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  iconBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: c.textMuted, marginTop: 1 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
});

/* ─── Separadores dentro da conversa ───────────────────────────────────────── */

export function DaySeparator({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
      <View style={{ height: 26, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surface, justifyContent: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>{label}</Text>
      </View>
    </View>
  );
}

export function CallNote({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.surface }}>
        <Phone size={15} weight="duotone" color={colors.textSecondary} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{text}</Text>
      </View>
    </View>
  );
}

/* ─── Mídia dentro das mensagens ───────────────────────────────────────────── */

function ChatImage({ uri, onOpen }: { uri: string; onOpen: (signedUri: string) => void }) {
  const { colors } = useTheme();
  const { data: signedUri } = useChatMediaUrl(uri);
  return (
    <Pressable onPress={() => signedUri && onOpen(signedUri)} accessibilityRole="imagebutton" accessibilityLabel="Abrir foto">
      <View style={{ width: 220, height: 264, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        {/* O link assinado muda a cada hora; a chave do cache é o arquivo, então a foto não é baixada de novo */}
        {signedUri ? <ExpoImage source={{ uri: signedUri, cacheKey: uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : <ActivityIndicator color={colors.primary} />}
      </View>
    </Pressable>
  );
}

// O vídeo só é baixado quando a pessoa toca para ver (antes, todos os vídeos da conversa baixavam ao abrir)
function ChatVideo({ uri }: { uri: string }) {
  const [started, setStarted] = useState(false);
  if (!started) {
    return (
      <Pressable
        onPress={() => setStarted(true)}
        accessibilityRole="button"
        accessibilityLabel="Tocar vídeo"
        style={{ width: 240, height: 180, borderRadius: 18, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={26} weight="fill" color="#FFFFFF" />
        </View>
      </Pressable>
    );
  }
  return <ChatVideoPlayer uri={uri} />;
}

function ChatVideoPlayer({ uri }: { uri: string }) {
  const { data: signedUri } = useChatMediaUrl(uri);
  const source = signedUri ? (Platform.OS === 'web' ? signedUri : { uri: signedUri, useCaching: true }) : null;
  const player = useVideoPlayer(source, (p) => { p.loop = false; p.play(); });
  return (
    <View style={{ width: 240, height: 180, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls contentFit="contain" />
    </View>
  );
}

function AudioBubble({ url, mine }: { url: string; mine: boolean }) {
  const { colors } = useTheme();
  const [player, setPlayer] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = async () => {
    try {
      if (player) {
        if (playing) { player.pause(); setPlaying(false); }
        else { player.play(); setPlaying(true); }
        return;
      }
      setLoading(true);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      // O link assinado é gerado na hora (o salvo na mensagem pode ter expirado)
      const src = await resolveChatMediaUrl(url);
      const p: any = createAudioPlayer({ uri: src });
      p.addListener('playbackStatusUpdate', (st: any) => {
        if (st.duration > 0) setProgress(Math.min((st.currentTime || 0) / st.duration, 1));
        if (st.didJustFinish) {
          setPlaying(false);
          setProgress(0);
          try { p.seekTo(0); } catch { /* o player pode já ter sido liberado */ }
        }
      });
      p.play();
      setPlayer(p);
      setPlaying(true);
    } catch (err) {
      console.warn('Erro ao tocar áudio:', err);
      showError('Áudio indisponível', 'Não foi possível reproduzir este áudio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => {
    if (!player) return;
    try { player.pause(); player.remove?.(); } catch { /* já liberado */ }
  }, [player]);

  const fg = mine ? colors.onPrimary : colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: 210, paddingVertical: 2 }}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pausar áudio' : 'Ouvir áudio'}
        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: mine ? 'rgba(255,255,255,0.22)' : colors.primarySoft }}
      >
        {loading ? <ActivityIndicator size="small" color={fg} /> : playing ? <Pause size={20} weight="fill" color={fg} /> : <Play size={20} weight="fill" color={fg} />}
      </Pressable>
      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: mine ? 'rgba(255,255,255,0.35)' : colors.border }}>
        <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: 2, backgroundColor: fg }} />
      </View>
    </View>
  );
}

/* ─── Mensagem ─────────────────────────────────────────────────────────────── */

export interface BubbleMessage {
  id: string;
  text?: string | null;
  created_at: string;
  read_at?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
}

const PLACEHOLDERS = new Set(['[Foto]', '[Vídeo]', '[Mensagem de Voz]']);

export function MessageBubble({ msg, mine, firstInGroup, lastInGroup, showRead, translation, translating, onTranslate, onOpenImage }: {
  msg: BubbleMessage;
  mine: boolean;
  firstInGroup: boolean;
  lastInGroup: boolean;
  /** Última mensagem minha, já lida pela outra pessoa. */
  showRead: boolean;
  translation?: string;
  translating: boolean;
  onTranslate: () => void;
  onOpenImage: (signedUri: string) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => bubbleStyles(colors), [colors]);

  const caption = msg.text && !PLACEHOLDERS.has(msg.text) ? msg.text : '';
  const isMedia = !!(msg.image_url || msg.video_url);
  const textStyle = [s.text, mine && s.textMine];
  const canTranslate = !mine && !!msg.text && !msg.audio_url && !isMedia && !translation;

  return (
    <View style={[s.wrap, mine ? s.wrapMine : s.wrapTheirs, { marginTop: firstInGroup ? 10 : 2 }]}>
      <View style={s.row}>
        <View
          style={[
            s.bubble,
            mine ? s.bubbleMine : s.bubbleTheirs,
            mine ? (lastInGroup && s.tailMine) : (lastInGroup && s.tailTheirs),
            isMedia && (caption ? s.bubbleMedia : s.bubbleBare),
          ]}
        >
          {msg.audio_url ? (
            <AudioBubble url={msg.audio_url} mine={mine} />
          ) : msg.image_url ? (
            <>
              <ChatImage uri={msg.image_url} onOpen={onOpenImage} />
              {caption ? <Text style={[textStyle, s.caption]} selectable>{caption}</Text> : null}
            </>
          ) : msg.video_url ? (
            <>
              <ChatVideo uri={msg.video_url} />
              {caption ? <Text style={[textStyle, s.caption]} selectable>{caption}</Text> : null}
            </>
          ) : (
            <>
              <Text style={textStyle} selectable>{msg.text}</Text>
              {translation ? (
                <View style={s.translation}>
                  <Text style={[textStyle, { fontStyle: 'italic' }]} selectable>{translation}</Text>
                  <Text style={s.translationNote}>Traduzido com DeepL</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {canTranslate && (
          <Pressable
            onPress={onTranslate}
            disabled={translating}
            accessibilityRole="button"
            accessibilityLabel="Traduzir mensagem"
            hitSlop={6}
            style={({ pressed }) => [s.translateBtn, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            {translating ? <ActivityIndicator size="small" color={colors.primary} /> : <Translate size={18} weight="duotone" color={colors.primary} />}
          </Pressable>
        )}
      </View>

      {lastInGroup && (
        <Text style={s.meta}>{clockTime(msg.created_at)}{mine && showRead ? ' · Lida' : ''}</Text>
      )}
    </View>
  );
}

const bubbleStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { maxWidth: '88%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  wrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, flexShrink: 1, minWidth: 0 },
  bubbleMine: { backgroundColor: c.primary },
  bubbleTheirs: { backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  bubbleMedia: { padding: 4 },
  bubbleBare: { padding: 0, backgroundColor: 'transparent', borderWidth: 0 },
  tailMine: { borderBottomRightRadius: 6 },
  tailTheirs: { borderBottomLeftRadius: 6 },
  // Links e palavras longas quebram dentro da bolha em vez de estourar a tela
  text: {
    fontSize: 16, lineHeight: 22, color: c.textPrimary,
    ...(Platform.OS === 'web' ? ({ overflowWrap: 'anywhere' } as object) : null),
  },
  textMine: { color: c.onPrimary },
  caption: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
  translation: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, gap: 4 },
  translationNote: { fontSize: 12, color: c.textMuted },
  translateBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  meta: { fontSize: 12, color: c.textMuted, marginTop: 4, marginHorizontal: 4, fontVariant: ['tabular-nums'] },
});

/* ─── Barra de envio ───────────────────────────────────────────────────────── */

const INPUT_MIN = 44;
const INPUT_MAX = 120;

export function Composer({
  value, onChange, onSend, sending, recording, seconds, maxSeconds,
  onPickMedia, onTakePhoto, onStartRecording, onCancelRecording, onSendRecording,
}: {
  value: string;
  onChange: (t: string) => void;
  onSend: () => void;
  sending: boolean;
  recording: boolean;
  seconds: number;
  maxSeconds: number;
  onPickMedia: () => void;
  onTakePhoto: () => void;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onSendRecording: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => composerStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const hasText = value.trim().length > 0;
  const inputRef = useRef<TextInput>(null);
  const [measured, setMeasured] = useState(INPUT_MIN);
  const grow = (h: number) => setMeasured(Math.min(INPUT_MAX, Math.max(INPUT_MIN, Math.ceil(h))));
  // Campo vazio volta ao tamanho de uma linha (depois de enviar, por exemplo)
  const inputHeight = value.length === 0 ? INPUT_MIN : measured;

  const handleChange = (text: string) => {
    onChange(text);
    if (Platform.OS === 'web') {
      // No web o conteúdo medido inclui a altura já aplicada: zera para medir só o texto
      const el = inputRef.current as unknown as HTMLTextAreaElement | null;
      if (el?.style) {
        el.style.height = 'auto';
        grow(el.scrollHeight);
      }
    }
  };
  const clock = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>
      {recording ? (
        <>
          <Pressable onPress={onCancelRecording} accessibilityRole="button" accessibilityLabel="Descartar gravação" style={[s.roundBtn, { backgroundColor: colors.errorSoft }]}>
            <Trash size={22} weight="duotone" color={colors.error} />
          </Pressable>
          <View style={s.recInfo} accessibilityLiveRegion="polite">
            <View style={[s.recDot, { opacity: seconds % 2 === 0 ? 1 : 0.45 }]} />
            <Text style={s.recTime}>{clock(seconds)}</Text>
            <Text style={s.recLimit}>{`limite ${clock(maxSeconds)}`}</Text>
          </View>
          <Pressable onPress={onSendRecording} disabled={sending} accessibilityRole="button" accessibilityLabel="Enviar áudio" style={[s.roundBtn, s.primaryBtn]}>
            {sending ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <PaperPlaneTilt size={22} weight="fill" color={colors.onPrimary} />}
          </Pressable>
        </>
      ) : (
        <>
          <Pressable onPress={() => { tick(); onPickMedia(); }} accessibilityRole="button" accessibilityLabel="Enviar foto ou vídeo da galeria" style={s.ghostBtn}>
            <ImageSquare size={24} weight="duotone" color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => { tick(); onTakePhoto(); }} accessibilityRole="button" accessibilityLabel="Tirar foto" style={s.ghostBtn}>
            <Camera size={24} weight="duotone" color={colors.textSecondary} />
          </Pressable>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={handleChange}
            placeholder="Mensagem"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            multiline
            numberOfLines={1}
            onContentSizeChange={Platform.OS === 'web' ? undefined : (e) => grow(e.nativeEvent.contentSize.height + 20)}
            accessibilityLabel="Escreva sua mensagem"
            style={[s.input, { height: inputHeight }]}
            // No web, Enter envia e Shift+Enter quebra a linha
            onKeyPress={(e) => {
              const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                onSend();
              }
            }}
          />
          {hasText ? (
            <Pressable onPress={() => { tick(); onSend(); }} disabled={sending} accessibilityRole="button" accessibilityLabel="Enviar mensagem" style={[s.roundBtn, s.primaryBtn, sending && { opacity: 0.6 }]}>
              {sending ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <PaperPlaneTilt size={22} weight="fill" color={colors.onPrimary} />}
            </Pressable>
          ) : (
            <Pressable onPress={onStartRecording} accessibilityRole="button" accessibilityLabel="Gravar áudio" style={[s.roundBtn, s.primaryBtn]}>
              <Microphone size={22} weight="fill" color={colors.onPrimary} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const composerStyles = (c: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 10, paddingTop: 10,
    backgroundColor: c.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  ghostBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, minWidth: 0, borderRadius: 22, paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10, paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16, lineHeight: 22, color: c.textPrimary, backgroundColor: c.surface,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: c.primary },
  recInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 44 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.error },
  recTime: { fontSize: 18, fontWeight: '700', color: c.textPrimary, fontVariant: ['tabular-nums'] },
  recLimit: { fontSize: 13, color: c.textMuted },
});

/** Faixa no lugar da barra de envio quando não dá mais para responder. */
export function LockedBar({ text }: { text: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 16,
        paddingBottom: Math.max(insets.bottom, 8) + 12, paddingHorizontal: 24,
        backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
      }}
    >
      <LockSimple size={18} weight="duotone" color={colors.textMuted} />
      <Text style={{ flexShrink: 1, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

/* ─── Foto em tela cheia ───────────────────────────────────────────────────── */

export function ImageViewer({ uri, onClose, label = 'Foto da conversa' }: { uri: string | null; onClose: () => void; label?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" accessibilityLabel={label} /> : null}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar foto"
          style={{
            position: 'absolute', top: insets.top + 12, right: 16, width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={22} weight="bold" color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}
