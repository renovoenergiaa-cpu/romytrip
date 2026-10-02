import { useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { Text, TextInput } from '../../components/ui/Text';
import { useTheme, type ThemeColors } from '../../theme';
import { Sheet } from '../../components/Sheet';
import { Avatar } from '../onboarding/components';
import {
  Camera, CaretLeft, FilmSlate, ImageSquare, MagnifyingGlass, MapPin, MusicNote, PaperPlaneTilt, Pause, Play,
  VideoCamera, X, type Icon,
} from '../onboarding/icons';
import { displayName, timeAgo } from './format';
import type { Song } from './useMusicSearch';

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/* ─── Comentários ──────────────────────────────────────────────────────────── */

export function CommentsSheet({ visible, onClose, comments, loading, failed, onRetry, text, onChangeText, onSend, sending }: {
  visible: boolean;
  onClose: () => void;
  comments: any[] | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  text: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const canSend = text.trim().length > 0 && !sending;

  return (
    <Sheet visible={visible} onClose={onClose} title="Comentários" fill>
      <View style={s.list}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} accessibilityLabel="Carregando comentários" />
        ) : failed ? (
          <View style={s.center}>
            <Text style={s.emptyTitle}>Não conseguimos carregar</Text>
            <Pressable onPress={onRetry} accessibilityRole="button" style={s.softBtn}><Text style={s.softBtnText}>Tentar de novo</Text></Pressable>
          </View>
        ) : comments && comments.length > 0 ? (
          <FlatList
            data={comments}
            keyExtractor={(c) => String(c.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingVertical: 8 }}
            renderItem={({ item }) => {
              const name = displayName(item.users?.name);
              return (
                <View style={s.comment}>
                  <Avatar photo={item.users?.photos?.[0]} name={name} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.commentHead}>
                      {name}
                      {item.created_at ? <Text style={s.commentWhen}>{`  ${timeAgo(item.created_at)}`}</Text> : null}
                    </Text>
                    <Text style={s.commentText} selectable>{item.content}</Text>
                  </View>
                </View>
              );
            }}
          />
        ) : (
          <View style={s.center}>
            <Text style={s.emptyTitle}>Ainda sem comentários</Text>
            <Text style={s.emptyText}>Seja a primeira pessoa a comentar.</Text>
          </View>
        )}
      </View>

      <View style={s.inputRow}>
        <TextInput
          value={text}
          onChangeText={onChangeText}
          placeholder="Escreva um comentário"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => canSend && onSend()}
          accessibilityLabel="Escreva um comentário"
          style={s.input}
        />
        <Pressable onPress={onSend} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Enviar comentário" style={[s.send, !canSend && { opacity: 0.45 }]}>
          {sending ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <PaperPlaneTilt size={22} weight="fill" color={colors.onPrimary} />}
        </Pressable>
      </View>
    </Sheet>
  );
}

/* ─── Escolher de onde vem a mídia ─────────────────────────────────────────── */

export function MediaSourceSheet({ visible, onClose, onPhoto, onVideo, onGallery }: {
  visible: boolean;
  onClose: () => void;
  onPhoto: () => void;
  onVideo: () => void;
  onGallery: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const options: { key: string; icon: Icon; title: string; text: string; onPress: () => void }[] = [
    { key: 'photo', icon: Camera, title: 'Tirar uma foto', text: 'Abra a câmera e registre o momento', onPress: onPhoto },
    { key: 'video', icon: VideoCamera, title: 'Gravar um vídeo', text: 'Grave agora para o feed do Romy', onPress: onVideo },
    { key: 'gallery', icon: ImageSquare, title: 'Escolher da galeria', text: 'Use uma foto ou vídeo que você já tem', onPress: onGallery },
  ];
  return (
    <Sheet visible={visible} onClose={onClose} title="Nova publicação">
      {options.map((o) => (
        <Pressable key={o.key} onPress={o.onPress} accessibilityRole="button" style={({ pressed }) => [s.option, pressed && s.pressedRow]}>
          <View style={s.optionTile}><o.icon size={26} weight="duotone" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.optionTitle}>{o.title}</Text>
            <Text style={s.optionText}>{o.text}</Text>
          </View>
        </Pressable>
      ))}
    </Sheet>
  );
}

/* ─── Publicar ─────────────────────────────────────────────────────────────── */

export function ComposeSheet({
  visible, onClose, mediaUri, isVideo, place, onChangePlace, locating, song, onClearSong, onPickSong,
  description, onChangeDescription, onPublish, publishing, music,
}: {
  visible: boolean;
  onClose: () => void;
  mediaUri: string | null;
  isVideo: boolean;
  place: string;
  onChangePlace: (t: string) => void;
  locating: boolean;
  song: { title: string } | null;
  onClearSong: () => void;
  onPickSong: (s: Song) => void;
  description: string;
  onChangeDescription: (t: string) => void;
  onPublish: () => void;
  publishing: boolean;
  music: ReturnType<typeof import('./useMusicSearch').useMusicSearch>;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const [picking, setPicking] = useState(false);
  const canPublish = !!mediaUri && place.trim().length > 0 && !publishing;

  const closePicker = () => { music.stop(); setPicking(false); };
  const close = () => { music.reset(); setPicking(false); onClose(); };

  return (
    <Sheet visible={visible} onClose={close} title={picking ? 'Escolher música' : 'Nova publicação'} fill>
      {picking ? (
        <View style={{ flex: 1 }}>
          <Pressable onPress={closePicker} accessibilityRole="button" style={s.back}>
            <CaretLeft size={18} weight="bold" color={colors.primary} />
            <Text style={s.backText}>Voltar</Text>
          </Pressable>
          <View style={s.searchBox}>
            <MagnifyingGlass size={20} weight="duotone" color={colors.textMuted} />
            <TextInput
              value={music.query}
              onChangeText={music.search}
              placeholder="Música ou artista"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              accessibilityLabel="Buscar música"
              style={s.searchInput}
            />
            {music.searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          {music.results.length === 0 ? (
            <View style={s.center}>
              <MusicNote size={36} weight="duotone" color={colors.textMuted} />
              <Text style={s.emptyText}>
                {music.failed ? 'Não conseguimos buscar agora. Confira sua internet.' : music.query.trim().length < 2 ? 'Digite o nome da música ou do artista.' : music.searching ? '' : 'Nenhuma música encontrada.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={music.results}
              keyExtractor={(m) => String(m.trackId)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              renderItem={({ item }) => {
                const playing = music.playingId === item.trackId;
                return (
                  <View style={s.song}>
                    <Pressable
                      onPress={() => item.previewUrl && music.preview(item)}
                      disabled={!item.previewUrl}
                      accessibilityRole="button"
                      accessibilityLabel={`${playing ? 'Pausar' : 'Ouvir'} ${item.trackName}`}
                      style={s.cover}
                    >
                      {item.artworkUrl60 ? <Image source={{ uri: item.artworkUrl60 }} style={StyleSheet.absoluteFill} /> : null}
                      <View style={s.coverShade}>{playing ? <Pause size={20} weight="fill" color="#FFFFFF" /> : <Play size={20} weight="fill" color="#FFFFFF" />}</View>
                    </Pressable>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.songTitle} numberOfLines={1}>{item.trackName}</Text>
                      <Text style={s.songArtist} numberOfLines={1}>{item.previewUrl ? item.artistName : `${item.artistName} · sem prévia`}</Text>
                    </View>
                    <Pressable onPress={() => { music.stop(); onPickSong(item); setPicking(false); }} accessibilityRole="button" style={s.useBtn}>
                      <Text style={s.useBtnText}>Usar</Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : (
        <>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
            <View style={s.preview}>
              {mediaUri && !isVideo ? <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Prévia da publicação" /> : null}
              {isVideo ? <View style={s.videoNote}><FilmSlate size={34} weight="duotone" color={colors.primary} /><Text style={s.videoText}>Vídeo selecionado</Text></View> : null}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Onde você está</Text>
              <View style={s.fieldBox}>
                <MapPin size={20} weight="duotone" color={colors.primary} />
                <TextInput
                  value={place}
                  onChangeText={onChangePlace}
                  placeholder={locating ? 'Buscando seu local…' : 'Cidade ou lugar'}
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  maxLength={120}
                  accessibilityLabel="Onde você está"
                  style={s.fieldInput}
                />
                {locating && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Música <Text style={s.optional}>(opcional)</Text></Text>
              <Pressable onPress={() => setPicking(true)} accessibilityRole="button" style={[s.fieldBox, song && { backgroundColor: colors.primarySoft }]}>
                <MusicNote size={20} weight="duotone" color={song ? colors.primary : colors.textMuted} />
                <Text style={[s.fieldInput, { paddingVertical: 14 }, !song && { color: colors.textMuted }]} numberOfLines={1}>{song ? song.title : 'Escolher música'}</Text>
                {song ? (
                  <Pressable onPress={onClearSong} hitSlop={10} accessibilityRole="button" accessibilityLabel="Tirar a música"><X size={18} weight="bold" color={colors.textSecondary} /></Pressable>
                ) : null}
              </Pressable>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Legenda <Text style={s.optional}>(opcional)</Text></Text>
              <TextInput
                value={description}
                onChangeText={onChangeDescription}
                placeholder="Conte algo sobre este lugar"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                multiline
                maxLength={500}
                accessibilityLabel="Legenda"
                style={s.textArea}
              />
            </View>
          </ScrollView>

          <Pressable onPress={onPublish} disabled={!canPublish} accessibilityRole="button" style={({ pressed }) => [s.cta, !canPublish && s.ctaOff, pressed && canPublish && { transform: [{ scale: 0.98 }] }]}>
            {publishing ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[s.ctaText, !canPublish && { color: colors.textMuted }]}>Publicar</Text>}
          </Pressable>
        </>
      )}
    </Sheet>
  );
}

/* ─── Editar legenda ───────────────────────────────────────────────────────── */

export function EditCaptionSheet({ visible, onClose, value, onChange, onSave, saving }: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (t: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Editar legenda">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Escreva a legenda"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        multiline
        maxLength={500}
        autoFocus
        accessibilityLabel="Legenda"
        style={[s.textArea, { marginBottom: 14 }]}
      />
      <Pressable onPress={onSave} disabled={saving} accessibilityRole="button" style={({ pressed }) => [s.cta, saving && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}>
        {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.ctaText}>Salvar legenda</Text>}
      </Pressable>
    </Sheet>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  list: { flex: 1, minHeight: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  emptyText: { fontSize: 15, lineHeight: 21, color: c.textSecondary, textAlign: 'center' },
  softBtn: { height: 44, paddingHorizontal: 20, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  softBtnText: { fontSize: 15, fontWeight: '700', color: c.primary },

  comment: { flexDirection: 'row', gap: 12 },
  commentHead: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  commentWhen: { fontSize: 13, fontWeight: '400', color: c.textMuted },
  commentText: { fontSize: 15, lineHeight: 21, color: c.textPrimary, marginTop: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  input: { flex: 1, minWidth: 0, height: 46, borderRadius: 23, paddingHorizontal: 18, fontSize: 16, color: c.textPrimary, backgroundColor: c.surface, ...noOutline },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },

  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderRadius: 16 },
  pressedRow: { backgroundColor: c.surface },
  optionTile: { width: 52, height: 52, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 17, fontWeight: '600', color: c.textPrimary, letterSpacing: -0.2 },
  optionText: { fontSize: 14, color: c.textSecondary, marginTop: 1 },

  preview: { height: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  videoNote: { alignItems: 'center', gap: 6 },
  videoText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  optional: { fontWeight: '400', color: c.textMuted },
  fieldBox: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.surface },
  fieldInput: { flex: 1, minWidth: 0, fontSize: 16, color: c.textPrimary, paddingVertical: 0, ...noOutline },
  textArea: { minHeight: 92, maxHeight: 160, borderRadius: 16, padding: 14, fontSize: 16, lineHeight: 22, textAlignVertical: 'top', color: c.textPrimary, backgroundColor: c.surface, ...noOutline },
  cta: { height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaOff: { backgroundColor: c.surface },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },

  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 6 },
  backText: { fontSize: 15, fontWeight: '700', color: c.primary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.surface },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, color: c.textPrimary, paddingVertical: 0, ...noOutline },
  song: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  cover: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: c.primarySoft },
  coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  songTitle: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
  songArtist: { fontSize: 14, color: c.textSecondary },
  useBtn: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  useBtnText: { fontSize: 14, fontWeight: '700', color: c.primary },
});
