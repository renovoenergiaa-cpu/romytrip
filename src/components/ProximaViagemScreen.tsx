import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { CityAutocomplete } from './CityAutocomplete';
import { CustomDatePicker } from './CustomDatePicker';
import { useTheme, type ThemeColors } from '../theme';
import {
  searchRealFlights, buildGoogleFlightsUrl, buildKayakUrl, buildDecolarUrl, type FlightResult, type FlightSearchParams,
} from '../services/flightService';
import { airportCode, isoToBr } from '../features/trips/airports';
import { showError } from '../lib/dialogs';
import { ChatEmpty, FilterChip } from '../features/chat/components';
import { AirplaneTilt, ArrowRight, CalendarBlank, CaretLeft, Minus, Plus, ShieldCheck, WifiSlash } from '../features/onboarding/icons';

type Cabin = FlightSearchParams['cabinClass'];
const CABINS: Cabin[] = ['Econômica', 'Executiva', 'Primeira Classe'];
const QUICK_DESTINATIONS = ['Rio de Janeiro, Brasil', 'Salvador, Brasil', 'Florianópolis, Brasil', 'Miami, EUA', 'Lisboa, Portugal', 'Buenos Aires, Argentina'];

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
};
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shortBr = (iso: string) => { const [, m, d] = iso.split('-'); return d && m ? `${d}/${m}` : ''; };

const openExternal = async (url: string) => {
  try {
    if (Platform.OS === 'web') { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
  } catch {
    try { await Linking.openURL(url); } catch { showError('Não foi possível abrir o link', 'Tente de novo em instantes.'); }
  }
};

// `originCity` pré-preenche a origem com a cidade da pessoa (quando conhecida)
export default function ProximaViagemScreen({ originCity }: { originCity?: string }) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [step, setStep] = useState<'form' | 'loading' | 'results'>('form');
  const [tripType, setTripType] = useState<'round' | 'oneway'>('round');
  const [originInput, setOriginInput] = useState<string | null>(null);
  const origin = originInput ?? originCity ?? '';
  const [destination, setDestination] = useState('');
  const [departure, setDeparture] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<Cabin>('Econômica');
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [failed, setFailed] = useState(false);

  const originCode = airportCode(origin);
  const destCode = airportCode(destination);
  const round = tripType === 'round';

  const preset = (daysAhead: number, tripDays = 7) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    setDeparture(toIso(addDays(daysAhead)));
    setReturning(toIso(addDays(daysAhead + tripDays)));
  };
  const weekend = () => {
    const now = new Date();
    const untilFriday = (5 - now.getDay() + 7) % 7 || 7;
    preset(untilFriday, 2);
  };

  const dateError =
    !departure ? 'Escolha a data de ida.'
    : round && !returning ? 'Escolha a data de volta.'
    : round && returning && returning < departure ? 'A volta precisa ser depois da ida.'
    : null;
  const canSearch = origin.trim().length > 0 && destination.trim().length > 0 && !dateError;

  const params: FlightSearchParams | null = departure && originCode && destCode
    ? { originCode, destCode, departureDate: isoToBr(departure), returnDate: round && returning ? isoToBr(returning) : undefined, passengers, cabinClass: cabin }
    : null;

  const search = async () => {
    if (!canSearch) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFailed(false);
    setFlights([]);
    setStep('loading');
    try {
      // Só voos de verdade: se nenhuma fonte responder, a lista fica vazia e a tela oferece os sites
      if (params) setFlights((await searchRealFlights(params)).flights);
    } catch (err) {
      console.warn('Erro na busca de voos:', err);
      setFailed(true);
    }
    setStep('results');
  };

  // Links de busca com a viagem preenchida. Kayak e Decolar exigem o código do aeroporto.
  const links: { key: string; name: string; text: string; url: string }[] = [];
  if (departure) {
    const o = originCode ?? origin.split(',')[0].trim();
    const d = destCode ?? destination.split(',')[0].trim();
    const dep = isoToBr(departure);
    const ret = round && returning ? isoToBr(returning) : undefined;
    links.push({ key: 'google', name: 'Google Voos', text: 'Compara companhias e mostra o histórico de preços', url: buildGoogleFlightsUrl({ originCode: o, destCode: d, departureDate: dep, returnDate: ret }) });
    if (originCode && destCode) {
      links.push({ key: 'kayak', name: 'Kayak', text: 'Ordenado pelo menor preço', url: buildKayakUrl({ originCode, destCode, departureDate: dep, returnDate: ret, passengers }) });
      links.push({ key: 'decolar', name: 'Decolar', text: 'Agência com pagamento em reais', url: buildDecolarUrl({ originCode, destCode, departureDate: dep, returnDate: ret, passengers }) });
    }
  }

  /* ─── Carregando ─── */
  if (step === 'loading') {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Procurando voos" />
        <Text style={s.centerText}>Procurando voos…</Text>
      </View>
    );
  }

  /* ─── Resultado ─── */
  if (step === 'results') {
    const route = `${origin.split(',')[0].trim()} → ${destination.split(',')[0].trim()}`;
    return (
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setStep('form')} accessibilityRole="button" accessibilityLabel="Editar busca" style={s.back}>
          <CaretLeft size={18} weight="bold" color={colors.primary} /><Text style={s.backText}>Editar busca</Text>
        </Pressable>

        <View style={s.summary}>
          <View style={s.summaryTile}><AirplaneTilt size={24} weight="duotone" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryRoute} numberOfLines={1}>{route}</Text>
            <Text style={s.summaryMeta}>
              {[departure ? shortBr(departure) : '', round && returning ? `volta ${shortBr(returning)}` : 'só ida', passengers === 1 ? '1 passageiro' : `${passengers} passageiros`, cabin].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {failed ? (
          <ChatEmpty icon={WifiSlash} title="Não conseguimos buscar agora" text="Você ainda pode pesquisar direto nos sites abaixo." />
        ) : null}

        {flights.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={s.section}>Voos encontrados</Text>
            {flights.map((f) => (
              <View key={f.id} style={s.flight}>
                <View style={s.flightTop}>
                  {f.airlineLogo ? <Image source={{ uri: f.airlineLogo }} style={s.logo} resizeMode="contain" /> : null}
                  <Text style={s.airline} numberOfLines={1}>{f.airline}</Text>
                  <Text style={s.price}>{f.price}</Text>
                </View>
                <Text style={s.flightMeta}>{`${f.departureTime} → ${f.arrivalTime} · ${f.duration} · ${f.stops}`}</Text>
                {f.secondaryPrice ? <Text style={s.flightNote}>{f.secondaryPrice}</Text> : null}
                <Pressable
                  onPress={() => openExternal(f.googleBookingUrl || f.directBookingUrl || f.deepLink || links[0]?.url || '')}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.offerBtn, pressed && s.pressed]}
                >
                  <Text style={s.offerText}>Ver oferta no site</Text><ArrowRight size={16} weight="bold" color={colors.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Text style={s.section}>{flights.length > 0 ? 'Compare também nos sites' : 'Pesquise nos sites'}</Text>
          {links.map((l) => (
            <Pressable key={l.key} onPress={() => openExternal(l.url)} accessibilityRole="button" accessibilityLabel={`Abrir ${l.name} com a sua busca`} style={({ pressed }) => [s.link, pressed && s.pressed]}>
              <View style={{ flex: 1 }}>
                <Text style={s.linkName}>{l.name}</Text>
                <Text style={s.linkText}>{l.text}</Text>
              </View>
              <ArrowRight size={20} weight="bold" color={colors.primary} />
            </Pressable>
          ))}
          {!originCode || !destCode ? (
            <Text style={s.note}>Para Kayak e Decolar precisamos do código do aeroporto, que ainda não temos para {!originCode ? 'a origem' : 'o destino'}. No Google Voos você ajusta a busca.</Text>
          ) : null}
        </View>

        <View style={s.disclaimer}>
          <ShieldCheck size={22} weight="duotone" color={colors.success} />
          <Text style={s.disclaimerText}>O Romy não vende passagens nem mostra preços de cabeça: você compra direto nos sites das empresas, com os valores deles.</Text>
        </View>
      </ScrollView>
    );
  }

  /* ─── Formulário ─── */
  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={s.title} accessibilityRole="header">Próxima viagem</Text>
        <Text style={s.sub}>Escolha o destino e compare voos nos sites das companhias e agências.</Text>
      </View>

      <View style={s.row} accessibilityRole="tablist">
        <FilterChip label="Ida e volta" selected={round} onPress={() => setTripType('round')} />
        <FilterChip label="Só ida" selected={!round} onPress={() => setTripType('oneway')} />
      </View>

      <View style={[s.field, { zIndex: 20 }]}>
        <Text style={s.label}>De onde você sai?</Text>
        <CityAutocomplete value={origin} onChangeText={setOriginInput} placeholder="Ex.: São Paulo" darkTheme={isDark} />
      </View>

      <View style={[s.field, { zIndex: 10 }]}>
        <Text style={s.label}>Para onde quer ir?</Text>
        <CityAutocomplete value={destination} onChangeText={setDestination} placeholder="Ex.: Lisboa" darkTheme={isDark} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          {QUICK_DESTINATIONS.map((d) => <FilterChip key={d} label={d.split(',')[0]} selected={destination === d} onPress={() => setDestination(d)} />)}
        </ScrollView>
      </View>

      <View style={s.dates}>
        <View style={s.field}>
          <Text style={s.label}>Ida</Text>
          <CustomDatePicker value={departure} onChange={(iso) => setDeparture(iso)} placeholder="DD/MM/AAAA" minimumDate={new Date()} />
        </View>
        {round ? (
          <View style={s.field}>
            <Text style={s.label}>Volta</Text>
            <CustomDatePicker value={returning} onChange={(iso) => setReturning(iso)} placeholder="DD/MM/AAAA" minimumDate={departure ? new Date(departure) : new Date()} />
          </View>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        <FilterChip label="Fim de semana" selected={false} onPress={weekend} />
        <FilterChip label="Em 15 dias" selected={false} onPress={() => preset(15)} />
        <FilterChip label="Em 1 mês" selected={false} onPress={() => preset(30)} />
        <FilterChip label="Em 2 meses" selected={false} onPress={() => preset(60)} />
      </ScrollView>
      {dateError && (departure || returning) ? <Text style={s.error}>{dateError}</Text> : null}

      <View style={s.field}>
        <Text style={s.label}>Passageiros</Text>
        <View style={s.stepper}>
          <Pressable onPress={() => setPassengers((n) => Math.max(1, n - 1))} accessibilityRole="button" accessibilityLabel="Menos um passageiro" style={s.stepBtn}><Minus size={20} weight="bold" color={colors.textPrimary} /></Pressable>
          <Text style={s.stepValue} accessibilityLiveRegion="polite">{passengers}</Text>
          <Pressable onPress={() => setPassengers((n) => Math.min(9, n + 1))} accessibilityRole="button" accessibilityLabel="Mais um passageiro" style={s.stepBtn}><Plus size={20} weight="bold" color={colors.textPrimary} /></Pressable>
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>Classe</Text>
        <View style={s.row} accessibilityRole="tablist">
          {CABINS.map((c) => <FilterChip key={c} label={c} selected={cabin === c} onPress={() => setCabin(c)} />)}
        </View>
      </View>

      <Pressable onPress={search} disabled={!canSearch} accessibilityRole="button" style={({ pressed }) => [s.cta, !canSearch && s.ctaOff, pressed && canSearch && s.pressed]}>
        <CalendarBlank size={20} weight="duotone" color={canSearch ? colors.onPrimary : colors.textMuted} />
        <Text style={[s.ctaText, !canSearch && { color: colors.textMuted }]}>Ver voos</Text>
      </Pressable>
    </ScrollView>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 18, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: c.background },
  centerText: { fontSize: 16, color: c.textSecondary },
  pressed: { transform: [{ scale: 0.98 }] },
  title: { fontSize: 30, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8 },
  sub: { fontSize: 15, lineHeight: 21, color: c.textSecondary, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  dates: { gap: 14 },
  error: { fontSize: 13, fontWeight: '600', color: c.error },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, padding: 4, borderRadius: 20, backgroundColor: c.surface },
  stepBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 48, textAlign: 'center', fontSize: 20, fontWeight: '800', color: c.textPrimary, fontVariant: ['tabular-nums'] },
  cta: { height: 56, borderRadius: 18, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  ctaOff: { backgroundColor: c.surface },
  ctaText: { fontSize: 17, fontWeight: '700', color: c.onPrimary },

  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 15, fontWeight: '700', color: c.primary },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  summaryTile: { width: 52, height: 52, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  summaryRoute: { fontSize: 19, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.3 },
  summaryMeta: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
  section: { fontSize: 18, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.2 },
  flight: { padding: 14, gap: 8, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  flightTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 6 },
  airline: { flex: 1, fontSize: 16, fontWeight: '700', color: c.textPrimary },
  price: { fontSize: 20, fontWeight: '800', color: c.textPrimary, fontVariant: ['tabular-nums'] },
  flightMeta: { fontSize: 15, color: c.textSecondary },
  flightNote: { fontSize: 13, color: c.textMuted },
  offerBtn: { height: 44, borderRadius: 14, backgroundColor: c.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  offerText: { fontSize: 15, fontWeight: '700', color: c.primary },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  linkName: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  linkText: { fontSize: 14, color: c.textSecondary, marginTop: 1 },
  note: { fontSize: 13, lineHeight: 19, color: c.textMuted },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: c.successSoft },
  disclaimerText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.textSecondary },
});
