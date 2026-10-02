import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, type ThemeColors } from '../../theme';
import { Tag } from '../onboarding/components';
import {
  AirplaneTilt, ArrowRight, Backpack, Compass, Heart, Quotes, Sparkle, Translate, type Icon,
} from '../onboarding/icons';
import {
  INTENTION_OPTIONS, INTEREST_OPTIONS, LANGUAGE_OPTIONS, TRAVEL_STYLE_OPTIONS, type Option,
} from '../onboarding/options';
import type { Traveler } from '../../hooks/useConnections';

/** Valor gravado → opção com ícone. Valores antigos fora da lista aparecem como estão. */
const toOptions = (ids: string[] | null | undefined, options: Option[]): Option[] =>
  (ids ?? []).map((id) => options.find((o) => o.id === id) ?? { id, label: id });

const shortDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
};

const firstPart = (v?: string | null) => (v ? String(v).split(',')[0].trim() : '');

export const TravelerCard = memo(function TravelerCard({ traveler, active, bottomInset, onOpenProfile }: {
  traveler: Traveler;
  /** Só o cartão da frente rola e troca de foto */
  active: boolean;
  /** Espaço livre embaixo para os botões não cobrirem o conteúdo */
  bottomInset: number;
  onOpenProfile: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const t = traveler;
  // Cadastros antigos guardaram caminhos do aparelho (file://), que não abrem para mais ninguém
  const photos = (t.photos ?? []).filter((p) => /^https?:\/\//.test(p ?? ''));
  const photo = photos[Math.min(photoIndex, Math.max(photos.length - 1, 0))];
  const firstName = t.name.split(/\s+/)[0];
  const destination = firstPart(t.destination);
  const dates = t.is_flexible ? 'datas em aberto' : [shortDate(t.check_in), shortDate(t.check_out)].filter(Boolean).join(' – ');

  const common = [
    ...toOptions(t.common.intentions, INTENTION_OPTIONS),
    ...toOptions(t.common.styles, TRAVEL_STYLE_OPTIONS),
    ...toOptions(t.common.interests, INTEREST_OPTIONS),
    ...toOptions(t.common.languages, LANGUAGE_OPTIONS),
  ];
  const intentions = toOptions(t.connection_intentions, INTENTION_OPTIONS);
  const styles_ = toOptions(t.travel_styles, TRAVEL_STYLE_OPTIONS);
  const interests = toOptions(t.interests, INTEREST_OPTIONS);
  const languages = toOptions(t.languages, LANGUAGE_OPTIONS);

  return (
    <ScrollView
      scrollEnabled={active}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.content, { paddingBottom: bottomInset }]}
    >
      {/* Foto e o essencial */}
      <View style={s.hero}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`Foto de ${firstName}`} />
        ) : (
          <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, s.centered]}>
            <Text style={s.initial}>{firstName.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        )}

        {active && photos.length > 1 && (
          <>
            <View style={s.bars} pointerEvents="none">
              {photos.map((_, i) => <View key={i} style={[s.bar, i === photoIndex && s.barOn]} />)}
            </View>
            <View style={s.tapZones}>
              <Pressable style={{ flex: 1 }} onPress={() => setPhotoIndex((i) => Math.max(i - 1, 0))} accessibilityLabel="Foto anterior" />
              <Pressable style={{ flex: 1 }} onPress={() => setPhotoIndex((i) => Math.min(i + 1, photos.length - 1))} accessibilityLabel="Próxima foto" />
            </View>
          </>
        )}

        <LinearGradient colors={['transparent', 'rgba(10,10,12,0.82)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        <View style={s.heroInfo} pointerEvents="none">
          <Text style={s.name} numberOfLines={1}>
            {firstName}<Text style={s.age}>{`, ${t.age}`}</Text>
          </Text>
          {t.city ? <Text style={s.city} numberOfLines={1}>{firstPart(t.city)}</Text> : null}
          <View style={s.pills}>
            {destination ? (
              <View style={s.pill}>
                <AirplaneTilt size={15} weight="fill" color="#FFFFFF" />
                <Text style={s.pillText} numberOfLines={1}>{`${destination}${dates ? ` · ${dates}` : ''}`}</Text>
              </View>
            ) : null}
            {t.sameDestination ? (
              <View style={[s.pill, s.pillAccent]}>
                <Sparkle size={15} weight="fill" color="#FFFFFF" />
                <Text style={s.pillText}>Mesmo destino que você</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {common.length > 0 && (
        <Section icon={Sparkle} title={common.length === 1 ? '1 coisa em comum' : `${common.length} coisas em comum`} s={s} colors={colors} highlight>
          <View style={s.tags}>{common.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>
      )}

      {t.bio ? (
        <Section icon={Quotes} title="Sobre" s={s} colors={colors}>
          <Text style={s.bio}>{t.bio}</Text>
        </Section>
      ) : null}

      {intentions.length > 0 && (
        <Section icon={Compass} title="O que procura" s={s} colors={colors}>
          <View style={s.tags}>{intentions.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>
      )}

      {styles_.length > 0 && (
        <Section icon={Backpack} title="Jeito de viajar" s={s} colors={colors}>
          <View style={s.tags}>{styles_.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>
      )}

      {interests.length > 0 && (
        <Section icon={Heart} title="Interesses" s={s} colors={colors}>
          <View style={s.tags}>{interests.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>
      )}

      {languages.length > 0 && (
        <Section icon={Translate} title="Idiomas" s={s} colors={colors}>
          <View style={s.tags}>{languages.map((o) => <Tag key={o.id} option={o} />)}</View>
        </Section>
      )}

      <Pressable onPress={onOpenProfile} disabled={!active} accessibilityRole="button" style={({ pressed }) => [s.profileLink, pressed && s.pressed]}>
        <Text style={s.profileLinkText}>{`Ver perfil de ${firstName}`}</Text>
        <ArrowRight size={18} weight="bold" color={colors.primary} />
      </Pressable>
    </ScrollView>
  );
});

function Section({ icon: SectionIcon, title, children, s, colors, highlight }: {
  icon: Icon;
  title: string;
  children: React.ReactNode;
  s: ReturnType<typeof getStyles>;
  colors: ThemeColors;
  highlight?: boolean;
}) {
  return (
    <View style={[s.section, highlight && s.sectionHighlight]}>
      <View style={s.sectionHeader}>
        <SectionIcon size={20} weight="duotone" color={colors.primary} />
        <Text style={s.sectionTitle} accessibilityRole="header">{title}</Text>
      </View>
      {children}
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.98 }] },

  hero: { width: '100%', aspectRatio: 4 / 5, borderRadius: 28, overflow: 'hidden', backgroundColor: c.surface, justifyContent: 'flex-end' },
  initial: { fontSize: 96, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
  bars: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 4, zIndex: 2 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  barOn: { backgroundColor: '#FFFFFF' },
  tapZones: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', zIndex: 1 },
  heroInfo: { padding: 22, gap: 2 },
  name: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8 },
  age: { fontWeight: '500' },
  city: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.88)' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%',
    height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pillAccent: { backgroundColor: c.primary },
  pillText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },

  section: { padding: 18, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  sectionHighlight: { backgroundColor: c.primarySoft, borderColor: 'transparent' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.1 },
  bio: { fontSize: 16, lineHeight: 24, color: c.textPrimary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  profileLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 },
  profileLinkText: { fontSize: 16, fontWeight: '700', color: c.primary },
});
