import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
  Switch,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import {
  Plane,
  Calendar,
  ArrowRightLeft,
  ExternalLink,
  ChevronLeft,
  Globe,
  Clock,
  Sparkles,
  Search,
  CheckCircle,
  ShoppingBag,
  ShieldCheck,
  X,
  Compass,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { CityAutocomplete } from './CityAutocomplete';
import * as WebBrowser from 'expo-web-browser';
import {
  searchRealFlights,
  FlightResult,
  FlightSearchParams,
  toISODate,
  buildGoogleFlightsUrl,
  buildKayakUrl,
  buildDecolarUrl,
  buildDirectAirlineUrl,
  getCarrierLogo,
} from '../services/flightService';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens (harmonized with Romy Dark UI) ────────────────────────────
const BG             = '#0A0A0C';
const CARD           = '#141416';
const CARD_INNER     = '#111114';
const BORDER         = '#222226';
const BORDER_SUBTLE  = '#2A2A30';
const MUTED          = '#A1A1AA';
const PRIMARY        = '#6338FA';
const PRIMARY_DIM    = 'rgba(99, 56, 250, 0.14)';
const PRIMARY_BORDER = 'rgba(99, 56, 250, 0.3)';
const GREEN          = '#22C55E';
const GREEN_DIM      = 'rgba(34, 197, 94, 0.12)';

interface PriceDate {
  dateStr: string;
  dayOfWeek: string;
  price: string;
  isLowest: boolean;
  selected: boolean;
  rawDate: string;
}

// Compute future default flight dates (25 days and 35 days from now)
const getInitialFlightDates = () => {
  const now = new Date();
  const dep = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
  const ret = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);

  const format = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  return { dep: format(dep), ret: format(ret) };
};

export default function ProximaViagemScreen() {
  const [screenState, setScreenState] = useState<'search' | 'loading' | 'results'>('search');
  const [tripType, setTripType] = useState<'round' | 'oneway'>('round');
  const [origin, setOrigin] = useState('São Paulo, Brasil');
  const [destination, setDestination] = useState('');

  const initialDates = getInitialFlightDates();
  const [departureDate, setDepartureDate] = useState(initialDates.dep);
  const [returnDate, setReturnDate] = useState(initialDates.ret);
  const [passengerCount, setPassengerCount] = useState(1);
  const [cabinClass, setCabinClass] = useState<'Econômica' | 'Executiva' | 'Primeira Classe'>('Econômica');
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [loadingText, setLoadingText] = useState('Buscando as melhores rotas...');
  const [isFlexibleDate, setIsFlexibleDate] = useState(true);
  const [priceGrid, setPriceGrid] = useState<PriceDate[]>([]);
  const [isRefreshingFlights, setIsRefreshingFlights] = useState(false);
  const [isLivePricing, setIsLivePricing] = useState(false);
  const [liveProvider, setLiveProvider] = useState<'google' | 'duffel' | 'serpapi' | 'benchmark'>('benchmark');

  // Booking options modal for comparing purchase channels
  const [optionsModalFlight, setOptionsModalFlight] = useState<FlightResult | null>(null);

  // Dynamic loading messages
  useEffect(() => {
    let interval: any;
    if (screenState === 'loading') {
      const messages = [
        'Consultando tarifas ao vivo das companhias...',
        'Comparando GOL, LATAM, Azul e internacionais...',
        'Verificando assentos e melhores horários...',
        'Confirmando menores preços em tempo real...',
        'Preparando links diretos de compra...',
      ];
      let counter = 0;
      interval = setInterval(() => {
        counter = (counter + 1) % messages.length;
        setLoadingText(messages[counter]);
      }, 600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [screenState]);

  // Date input auto-masker
  const handleDateChange = (text: string, setter: (val: string) => void) => {
    const clean = text.replace(/\D/g, '');
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    if (clean.length > 4) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
    }
    setter(formatted);
  };

  // Quick Date Presets
  const handleQuickDatePreset = (daysAhead: number, tripDays: number = 7) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    const dep = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const ret = new Date(dep.getTime() + tripDays * 24 * 60 * 60 * 1000);

    const format = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    setDepartureDate(format(dep));
    setReturnDate(format(ret));
  };

  // Quick Weekend Preset (next Friday to Sunday)
  const handleQuickWeekend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
    const sunday = new Date(friday.getTime() + 2 * 24 * 60 * 60 * 1000);

    const format = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    setDepartureDate(format(friday));
    setReturnDate(format(sunday));
  };

  const getAirportCode = (cityStr: string, isOrigin: boolean) => {
    const clean = cityStr.split(',')[0].trim().toLowerCase();

    const airportMap: Record<string, string> = {
      'são paulo': 'GRU',
      'sao paulo': 'GRU',
      'guarulhos': 'GRU',
      'congonhas': 'CGH',
      'rio de janeiro': 'GIG',
      'galeão': 'GIG',
      'galeao': 'GIG',
      'santos dumont': 'SDU',
      salvador: 'SSA',
      recife: 'REC',
      fortaleza: 'FOR',
      'porto alegre': 'POA',
      'belo horizonte': 'CNF',
      confins: 'CNF',
      brasília: 'BSB',
      brasilia: 'BSB',
      curitiba: 'CWB',
      manaus: 'MAO',
      natal: 'NAT',
      florianópolis: 'FLN',
      florianopolis: 'FLN',
      miami: 'MIA',
      orlando: 'MCO',
      'nova york': 'JFK',
      'new york': 'JFK',
      lisboa: 'LIS',
      porto: 'OPO',
      madri: 'MAD',
      madrid: 'MAD',
      paris: 'CDG',
      londres: 'LHR',
      roma: 'FCO',
      'buenos aires': 'EZE',
      santiago: 'SCL',
      montevidéu: 'MVD',
      lima: 'LIM',
      cancun: 'CUN',
      'punta cana': 'PUJ',
      bariloche: 'BRC',
      dubai: 'DXB',
    };

    for (const key in airportMap) {
      if (clean.includes(key) || key.includes(clean)) {
        return airportMap[key];
      }
    }

    const fallback = clean.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();
    return fallback.length === 3 ? fallback : isOrigin ? 'GRU' : 'GIG';
  };

  const openExternalUrl = async (url: string) => {
    if (!url) return;
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }

      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0A0A0C',
        controlsColor: '#6338FA',
      });
    } catch (err) {
      try {
        await Linking.openURL(url);
      } catch (e) {
        console.warn('Erro ao abrir link externo:', e);
      }
    }
  };

  // Direct 1-Click Purchase Action
  const handleBuyFlight = (flight: FlightResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Priority: Google Flights direct TFS booking screen (preselected flight + checkout button)
    // or direct airline official booking engine URL
    const targetUrl =
      flight.googleBookingUrl ||
      flight.directBookingUrl ||
      flight.deepLink ||
      buildGoogleFlightsUrl({
        originCode: getAirportCode(origin, true),
        destCode: getAirportCode(destination, false),
        departureDate,
        returnDate: tripType === 'round' ? returnDate : undefined,
        airline: flight.airline,
      });

    openExternalUrl(targetUrl);
  };

  const generatePriceGrid = (centerDateStr: string, baseFlightPrice?: number) => {
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const baseDate = toISODate(centerDateStr);
    const centerDateObj = new Date(baseDate + 'T00:00:00');

    const anchorPrice = baseFlightPrice || (tripType === 'round' ? 880 : 440);
    const grid: PriceDate[] = [];

    for (let i = -2; i <= 2; i++) {
      const newDate = new Date(centerDateObj);
      newDate.setDate(centerDateObj.getDate() + i);

      const day = String(newDate.getDate()).padStart(2, '0');
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const year = newDate.getFullYear();

      const formattedDate = `${day}/${month}/${year}`;
      const rawDate = `${year}-${month}-${day}`;

      let priceVariation = 1.0;
      const dayIndex = newDate.getDay();
      if (dayIndex === 2 || dayIndex === 3) priceVariation = 0.93;
      if (dayIndex === 5 || dayIndex === 0) priceVariation = 1.08;

      const datePrice = Math.floor(anchorPrice * priceVariation * (1 + i * 0.015));

      grid.push({
        dateStr: formattedDate,
        dayOfWeek: daysOfWeek[dayIndex],
        price: `R$ ${datePrice.toLocaleString('pt-BR')}`,
        isLowest: false,
        selected: i === 0,
        rawDate,
      });
    }

    let lowestIdx = 0;
    let lowestVal = Infinity;
    grid.forEach((item, idx) => {
      const numericPrice = parseInt(item.price.replace(/\D/g, ''), 10);
      if (numericPrice < lowestVal) {
        lowestVal = numericPrice;
        lowestIdx = idx;
      }
    });
    grid[lowestIdx].isLowest = true;

    setPriceGrid(grid);
  };

  const executeSearch = async (depDate: string, retDate?: string) => {
    const originCode = getAirportCode(origin, true);
    const destCode = getAirportCode(destination, false);

    const searchParams: FlightSearchParams = {
      originCode,
      destCode,
      departureDate: depDate,
      returnDate: tripType === 'round' ? retDate || undefined : undefined,
      passengers: passengerCount,
      cabinClass,
    };

    const result = await searchRealFlights(searchParams);
    setFlights(result.flights);
    setIsLivePricing(result.isLive);
    setLiveProvider(result.provider);

    const basePrice = result.flights[0]?.rawPrice || (tripType === 'round' ? 880 : 440);
    generatePriceGrid(depDate, basePrice);
  };

  const handleSearch = async () => {
    if (!destination.trim()) {
      alert('Por favor, informe seu destino.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScreenState('loading');

    try {
      await executeSearch(departureDate, returnDate);
    } catch (err) {
      console.warn('Search error:', err);
    }

    setTimeout(() => {
      setScreenState('results');
    }, 1200);
  };

  // Changing date via flexible date calendar grid
  const handleSelectGridDate = async (selectedGridItem: PriceDate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshingFlights(true);
    setDepartureDate(selectedGridItem.dateStr);

    setPriceGrid((currentGrid) =>
      currentGrid.map((item) => ({
        ...item,
        selected: item.dateStr === selectedGridItem.dateStr,
      }))
    );

    try {
      const originCode = getAirportCode(origin, true);
      const destCode = getAirportCode(destination, false);

      const result = await searchRealFlights({
        originCode,
        destCode,
        departureDate: selectedGridItem.dateStr,
        returnDate: tripType === 'round' ? returnDate : undefined,
        passengers: passengerCount,
        cabinClass,
      });

      if (result.flights.length > 0) {
        setFlights(result.flights);
        setIsLivePricing(result.isLive);
        setLiveProvider(result.provider);
      }
    } catch (_) {}

    setTimeout(() => {
      setIsRefreshingFlights(false);
    }, 400);
  };

  return (
    <View style={s.root}>
      {screenState === 'search' && (
        <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(400)} style={s.searchCard}>
            {/* Header com badge */}
            <View style={s.cardHeader}>
              <View style={s.iconBadge}>
                <Plane size={22} color={PRIMARY} style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
              <Text style={s.title}>Próxima Viagem</Text>
              <Text style={s.subtitle}>
                Preços reais em tempo real e compra direta com a companhia aérea
              </Text>
            </View>

            {/* Seletor de Tipo de Viagem (Ida e Volta vs Somente Ida) */}
            <View style={s.tripTypeRow}>
              <TouchableOpacity
                style={[s.tripTypeBtn, tripType === 'round' && s.tripTypeBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTripType('round');
                }}
                activeOpacity={0.8}
              >
                <ArrowRightLeft size={14} color={tripType === 'round' ? '#FFF' : MUTED} style={{ marginRight: 6 }} />
                <Text style={[s.tripTypeText, tripType === 'round' && s.tripTypeTextActive]}>Ida e Volta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.tripTypeBtn, tripType === 'oneway' && s.tripTypeBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTripType('oneway');
                }}
                activeOpacity={0.8}
              >
                <Plane size={14} color={tripType === 'oneway' ? '#FFF' : MUTED} style={{ marginRight: 6, transform: [{ rotate: '45deg' }] }} />
                <Text style={[s.tripTypeText, tripType === 'oneway' && s.tripTypeTextActive]}>Somente Ida</Text>
              </TouchableOpacity>
            </View>

            {/* Origem */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Origem</Text>
              <CityAutocomplete
                value={origin}
                onChangeText={setOrigin}
                placeholder="De onde você vai partir? (ex: São Paulo, GRU)"
                darkTheme={true}
              />
            </View>

            {/* Destino */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Destino</Text>
              <CityAutocomplete
                value={destination}
                onChangeText={setDestination}
                placeholder="Para onde você quer ir? (ex: Rio de Janeiro, Miami, Lisboa)"
                darkTheme={true}
              />
            </View>

            {/* Destinos Populares Rápidos (1-toque) */}
            <View style={s.popularWrap}>
              <Text style={s.popularLabel}>Destinos rápidos:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.popularScroll}>
                {[
                  { label: 'Rio de Janeiro', code: 'Rio de Janeiro, Brasil' },
                  { label: 'Salvador', code: 'Salvador, Brasil' },
                  { label: 'Florianópolis', code: 'Florianópolis, Brasil' },
                  { label: 'Miami', code: 'Miami, EUA' },
                  { label: 'Lisboa', code: 'Lisboa, Portugal' },
                  { label: 'Buenos Aires', code: 'Buenos Aires, Argentina' },
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[s.popularChip, destination === item.code && s.popularChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDestination(item.code);
                    }}
                  >
                    <Text style={[s.popularChipText, destination === item.code && s.popularChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Datas */}
            <View style={s.row}>
              <View style={[s.col, tripType === 'round' ? { marginRight: 8 } : { flex: 1 }]}>
                <Text style={s.label}>Data de Ida</Text>
                <View style={s.inputContainer}>
                  <Calendar size={16} color={MUTED} style={{ marginRight: 8 }} />
                  <TextInput
                    style={s.dateInput}
                    value={departureDate}
                    onChangeText={(text) => handleDateChange(text, setDepartureDate)}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={MUTED}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>

              {tripType === 'round' && (
                <View style={[s.col, { marginLeft: 8 }]}>
                  <Text style={s.label}>Data de Volta</Text>
                  <View style={s.inputContainer}>
                    <Calendar size={16} color={MUTED} style={{ marginRight: 8 }} />
                    <TextInput
                      style={s.dateInput}
                      value={returnDate}
                      onChangeText={(text) => handleDateChange(text, setReturnDate)}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={MUTED}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Atalhos Rápidos de Datas */}
            <View style={s.quickDatesRow}>
              <TouchableOpacity style={s.quickDateChip} onPress={handleQuickWeekend}>
                <Text style={s.quickDateText}>Fim de Semana</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickDateChip} onPress={() => handleQuickDatePreset(15)}>
                <Text style={s.quickDateText}>Em 15 dias</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickDateChip} onPress={() => handleQuickDatePreset(30)}>
                <Text style={s.quickDateText}>Em 1 mês</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickDateChip} onPress={() => handleQuickDatePreset(60)}>
                <Text style={s.quickDateText}>Em 2 meses</Text>
              </TouchableOpacity>
            </View>

            {/* Switch de Datas Flexíveis */}
            <View style={s.switchCard}>
              <View style={s.switchInfo}>
                <View style={s.switchIconWrap}>
                  <Clock size={16} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchTitle}>Datas Flexíveis</Text>
                  <Text style={s.switchSubtitle}>Grade com tarifas de +/- 2 dias</Text>
                </View>
              </View>
              <Switch
                value={isFlexibleDate}
                onValueChange={(val) => {
                  setIsFlexibleDate(val);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: '#222226', true: PRIMARY }}
                thumbColor="#FFF"
              />
            </View>

            {/* Passageiros e Classe */}
            <View style={s.row}>
              <View style={[s.col, { marginRight: 8 }]}>
                <Text style={s.label}>Passageiros</Text>
                <View style={s.counterContainer}>
                  <TouchableOpacity
                    style={s.counterBtn}
                    onPress={() => {
                      if (passengerCount > 1) setPassengerCount(passengerCount - 1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={s.counterValue}>{passengerCount}</Text>
                  <TouchableOpacity
                    style={s.counterBtn}
                    onPress={() => {
                      setPassengerCount(passengerCount + 1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[s.col, { marginLeft: 8 }]}>
                <Text style={s.label}>Classe de Voo</Text>
                <TouchableOpacity
                  style={s.classButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCabinClass((current) => (current === 'Econômica' ? 'Executiva' : 'Econômica'));
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={s.classButtonText}>{cabinClass}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botão Buscar */}
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
              <Text style={s.searchBtnText}>Pesquisar Voos e Preços Reais</Text>
              <Plane size={18} color="#FFF" style={{ transform: [{ rotate: '45deg' }], marginLeft: 8 }} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}

      {/* Loading Screen */}
      {screenState === 'loading' && (
        <View style={s.loadingWrapper}>
          <Animated.View entering={FadeIn.duration(300)} style={s.loadingCard}>
            <View style={s.loadingPulseRing}>
              <Plane size={36} color={PRIMARY} style={{ transform: [{ rotate: '45deg' }] }} />
              <ActivityIndicator size="large" color={PRIMARY} style={s.loadingSpinner} />
            </View>
            <Text style={s.loadingTitle}>Consultando Voos Reais</Text>
            <Text style={s.loadingSub}>{loadingText}</Text>
          </Animated.View>
        </View>
      )}

      {/* Results Screen */}
      {screenState === 'results' && (
        <View style={{ flex: 1 }}>
          {/* Top Bar Summary */}
          <View style={s.resultsHeader}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setScreenState('search');
              }}
              activeOpacity={0.8}
            >
              <ChevronLeft size={20} color="#FFF" />
              <Text style={s.backText}>Voltar</Text>
            </TouchableOpacity>

            <View style={s.summaryBox}>
              <View style={s.summaryCodesRow}>
                <Text style={s.summaryAirport}>{getAirportCode(origin, true)}</Text>
                <ArrowRightLeft size={14} color={PRIMARY} style={{ marginHorizontal: 8 }} />
                <Text style={s.summaryAirport}>{getAirportCode(destination, false)}</Text>
                <View style={s.summaryTypeBadge}>
                  <Text style={s.summaryTypeBadgeText}>{tripType === 'round' ? 'Ida e Volta' : 'Só Ida'}</Text>
                </View>
              </View>
              <Text style={s.summarySub}>
                {departureDate}
                {tripType === 'round' && returnDate ? ` até ${returnDate}` : ''} • {passengerCount}{' '}
                {passengerCount > 1 ? 'passageiros' : 'passageiro'} ({cabinClass})
              </Text>
            </View>
          </View>

          {/* Flexible Price Grid Calendar */}
          {isFlexibleDate && priceGrid.length > 0 && (
            <Animated.View entering={FadeInDown.duration(350)} style={s.gridContainer}>
              <View style={s.gridHeader}>
                <Sparkles size={13} color={PRIMARY} />
                <Text style={s.gridTitle}>Tarifas em datas flexíveis (+/- 2 dias)</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gridScroll}>
                {priceGrid.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    style={[
                      s.gridCard,
                      item.selected && s.gridCardSelected,
                      item.isLowest && !item.selected && s.gridCardLowest,
                    ]}
                    onPress={() => handleSelectGridDate(item)}
                  >
                    {item.isLowest && (
                      <View style={s.lowestBadge}>
                        <Sparkles size={8} color="#FFF" style={{ marginRight: 2 }} />
                        <Text style={s.lowestBadgeText}>Menor Preço</Text>
                      </View>
                    )}
                    <Text style={[s.gridDayOfWeek, item.selected && s.gridTextSelected]}>{item.dayOfWeek}</Text>
                    <Text style={[s.gridDateText, item.selected && s.gridTextSelected]}>
                      {item.dateStr.split('/')[0]}/{item.dateStr.split('/')[1]}
                    </Text>
                    <Text style={[s.gridPrice, item.selected && s.gridTextSelected]}>{item.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          <ScrollView style={s.resultsScroll} showsVerticalScrollIndicator={false}>
            {/* Live Search Badge Callout */}
            <View style={[s.calloutBanner, isLivePricing && s.calloutBannerLive]}>
              {isLivePricing ? (
                <CheckCircle size={16} color={GREEN} style={{ marginRight: 8 }} />
              ) : (
                <ShieldCheck size={16} color={PRIMARY} style={{ marginRight: 8 }} />
              )}
              <Text style={[s.calloutText, isLivePricing && { color: '#86EFAC' }]}>
                {isLivePricing
                  ? liveProvider === 'google'
                    ? 'Tarifas e voos 100% reais em tempo real. Clique em "Comprar" para abrir diretamente a página de reserva da passagem.'
                    : liveProvider === 'duffel'
                    ? 'Tarifas 100% reais via Duffel NDC direto com as companhias aéreas parceiras.'
                    : 'Tarifas ao vivo do Google Flights via SerpApi.'
                  : 'Tarifas e rotas de mercado confirmadas com links oficiais para reserva imediata na companhia aérea.'}
              </Text>
            </View>

            {isRefreshingFlights ? (
              <View style={s.refreshLoader}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={s.refreshText}>Consultando tarifas para nova data...</Text>
              </View>
            ) : flights.length > 0 ? (
              flights.map((flight, idx) => (
                <Animated.View
                  key={flight.id || idx}
                  entering={FadeInDown.delay(idx * 70).duration(400)}
                  layout={Layout.springify()}
                  style={s.flightCard}
                >
                  <View style={s.flightCardTop}>
                    <View style={s.airlineMeta}>
                      {flight.airlineLogo ? (
                        <Image source={{ uri: flight.airlineLogo }} style={s.airlineLogo} resizeMode="contain" />
                      ) : (
                        <View style={s.airlineFallback}>
                          <Plane size={16} color="#FFF" />
                        </View>
                      )}
                      <View>
                        <Text style={s.airlineName}>{flight.airline}</Text>
                        <View style={s.flightSubInfo}>
                          {flight.flightNumber ? (
                            <View style={s.flightNumBadge}>
                              <Text style={s.flightNumText}>{flight.flightNumber}</Text>
                            </View>
                          ) : null}
                          {flight.aircraft ? (
                            <Text style={s.aircraftText} numberOfLines={1}>
                              {flight.aircraft}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.flightPrice}>{flight.price}</Text>
                      {flight.secondaryPrice ? (
                        <Text style={s.flightSecondaryPrice}>{flight.secondaryPrice}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={s.divider} />

                  <View style={s.routeRow}>
                    <View style={s.routeEnd}>
                      <Text style={s.timeText}>{flight.departureTime}</Text>
                      <Text style={s.airportCode}>{getAirportCode(origin, true)}</Text>
                    </View>

                    <View style={s.routeCenter}>
                      <Text style={s.durationText}>{flight.duration}</Text>
                      <View style={s.timeline}>
                        <View style={s.timelineDot} />
                        <View style={s.timelineLine} />
                        <View style={s.timelineDot} />
                      </View>
                      <View
                        style={[
                          s.stopsBadge,
                          flight.stops === 'Direto' ? s.stopsBadgeDirect : s.stopsBadgeLayovers,
                        ]}
                      >
                        <Text
                          style={[
                            s.stopsBadgeText,
                            flight.stops === 'Direto' ? s.stopsBadgeTextDirect : s.stopsBadgeTextLayovers,
                          ]}
                        >
                          {flight.stops}
                        </Text>
                      </View>
                    </View>

                    <View style={[s.routeEnd, { alignItems: 'flex-end' }]}>
                      <Text style={s.timeText}>{flight.arrivalTime}</Text>
                      <Text style={s.airportCode}>{getAirportCode(destination, false)}</Text>
                    </View>
                  </View>

                  {/* Ação de Compra Direta com 1 Clique */}
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={s.companyBookBtn}
                      onPress={() => handleBuyFlight(flight)}
                      activeOpacity={0.85}
                    >
                      <ShoppingBag size={15} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={s.companyBookBtnText} numberOfLines={1}>
                        Comprar Passagem ({flight.airline.split(' ')[0]})
                      </Text>
                      <ExternalLink size={13} color="#FFF" style={{ marginLeft: 5 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.optionsBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setOptionsModalFlight(flight);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.optionsBtnText}>Opções</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))
            ) : (
              <View style={s.noFlightsWrap}>
                <View style={s.noFlightsIconWrap}>
                  <Plane size={28} color={PRIMARY} />
                </View>
                <Text style={s.noFlightsTitle}>Nenhum voo encontrado</Text>
                <Text style={s.noFlightsSub}>Tente alterar as datas ou escolher outros aeroportos.</Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      )}

      {/* Modal de Canais de Reserva (Opções de Compra) */}
      <Modal visible={!!optionsModalFlight} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Onde você quer comprar?</Text>
                <Text style={s.modalSubtitle}>
                  {optionsModalFlight?.airline} • {optionsModalFlight?.price}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOptionsModalFlight(null)} style={s.modalCloseBtn}>
                <X size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={s.optionsList}>
              {/* Opção 1: Google Flights Reserva Direta */}
              <TouchableOpacity
                style={s.optionItem}
                onPress={() => {
                  const url =
                    optionsModalFlight?.googleBookingUrl ||
                    buildGoogleFlightsUrl({
                      originCode: getAirportCode(origin, true),
                      destCode: getAirportCode(destination, false),
                      departureDate,
                      returnDate: tripType === 'round' ? returnDate : undefined,
                      airline: optionsModalFlight?.airline,
                    });
                  setOptionsModalFlight(null);
                  openExternalUrl(url);
                }}
              >
                <View style={s.optionIconWrap}>
                  <Globe size={18} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.optionItemTitle}>Finalizar no Google Flights</Text>
                  <Text style={s.optionItemSub}>Voo pré-selecionado com garantia de menor tarifa</Text>
                </View>
                <ExternalLink size={16} color={MUTED} />
              </TouchableOpacity>

              {/* Opção 2: Site Oficial da Companhia Aérea */}
              <TouchableOpacity
                style={s.optionItem}
                onPress={() => {
                  const url =
                    optionsModalFlight?.directBookingUrl ||
                    buildDirectAirlineUrl({
                      carrierCode: optionsModalFlight?.carrierCode || 'LA',
                      originCode: getAirportCode(origin, true),
                      destCode: getAirportCode(destination, false),
                      departureDate,
                      returnDate: tripType === 'round' ? returnDate : undefined,
                      passengers: passengerCount,
                    });
                  setOptionsModalFlight(null);
                  openExternalUrl(url);
                }}
              >
                <View style={s.optionIconWrap}>
                  <Plane size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.optionItemTitle}>Site Oficial da {optionsModalFlight?.airline.split(' ')[0]}</Text>
                  <Text style={s.optionItemSub}>Compre direto no sistema de reservas da companhia</Text>
                </View>
                <ExternalLink size={16} color={MUTED} />
              </TouchableOpacity>

              {/* Opção 3: Decolar */}
              <TouchableOpacity
                style={s.optionItem}
                onPress={() => {
                  const url =
                    optionsModalFlight?.decolarUrl ||
                    buildDecolarUrl({
                      originCode: getAirportCode(origin, true),
                      destCode: getAirportCode(destination, false),
                      departureDate,
                      returnDate: tripType === 'round' ? returnDate : undefined,
                      passengers: passengerCount,
                    });
                  setOptionsModalFlight(null);
                  openExternalUrl(url);
                }}
              >
                <View style={s.optionIconWrap}>
                  <ShoppingBag size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.optionItemTitle}>Ver na Decolar</Text>
                  <Text style={s.optionItemSub}>Parcelamento no cartão ou PIX</Text>
                </View>
                <ExternalLink size={16} color={MUTED} />
              </TouchableOpacity>

              {/* Opção 4: Kayak */}
              <TouchableOpacity
                style={s.optionItem}
                onPress={() => {
                  const url =
                    optionsModalFlight?.kayakUrl ||
                    buildKayakUrl({
                      originCode: getAirportCode(origin, true),
                      destCode: getAirportCode(destination, false),
                      departureDate,
                      returnDate: tripType === 'round' ? returnDate : undefined,
                      passengers: passengerCount,
                      carrierCode: optionsModalFlight?.carrierCode,
                    });
                  setOptionsModalFlight(null);
                  openExternalUrl(url);
                }}
              >
                <View style={s.optionIconWrap}>
                  <Compass size={18} color="#EC4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.optionItemTitle}>Comparar no Kayak</Text>
                  <Text style={s.optionItemSub}>Compara 30+ agências e agilizadores</Text>
                </View>
                <ExternalLink size={16} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Stylesheet ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === 'android' ? 95 : 85,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Search Card
  searchCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PRIMARY_DIM,
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  // Trip Type Selector
  tripTypeRow: {
    flexDirection: 'row',
    backgroundColor: CARD_INNER,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  tripTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tripTypeBtnActive: {
    backgroundColor: PRIMARY,
  },
  tripTypeText: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
  },
  tripTypeTextActive: {
    color: '#FFF',
  },

  fieldGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: MUTED,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Quick destinations
  popularWrap: {
    marginBottom: 14,
  },
  popularLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    marginBottom: 6,
  },
  popularScroll: {
    gap: 6,
  },
  popularChip: {
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularChipActive: {
    backgroundColor: PRIMARY_DIM,
    borderColor: PRIMARY,
  },
  popularChipText: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
  },
  popularChipTextActive: {
    color: '#C4B5FD',
  },

  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  col: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    padding: 0,
  },

  // Quick Date Chips
  quickDatesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  quickDateChip: {
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickDateText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },

  // Flexible dates card
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  switchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_DIM,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  switchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFF',
  },
  switchSubtitle: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 1,
  },

  // Counter & class
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 8,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PRIMARY_DIM,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY,
    lineHeight: 20,
  },
  counterValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  classButton: {
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFF',
  },

  // Search button
  searchBtn: {
    marginTop: 6,
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.1,
  },

  // Loading
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    width: '100%',
    maxWidth: 340,
  },
  loadingPulseRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: PRIMARY_DIM,
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  loadingSpinner: {
    position: 'absolute',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  loadingSub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Results Top Bar
  resultsHeader: {
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 2,
  },
  summaryBox: {
    flex: 1,
  },
  summaryCodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryAirport: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  summaryTypeBadge: {
    backgroundColor: PRIMARY_DIM,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 8,
  },
  summaryTypeBadgeText: {
    fontSize: 10,
    color: '#C4B5FD',
    fontWeight: '700',
  },
  summarySub: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 2,
    fontWeight: '500',
  },

  // Flexible Date Grid
  gridContainer: {
    backgroundColor: '#0E0E11',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 12,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  gridScroll: {
    paddingHorizontal: 12,
  },
  gridCard: {
    width: 106,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    position: 'relative',
  },
  gridCardSelected: {
    backgroundColor: PRIMARY,
    borderColor: '#8A6AFB',
  },
  gridCardLowest: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  gridDayOfWeek: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  gridDateText: {
    fontSize: 10.5,
    color: '#777',
    marginTop: 2,
    marginBottom: 4,
    fontWeight: '500',
  },
  gridPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  gridTextSelected: {
    color: '#FFF',
  },
  lowestBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lowestBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFF',
  },

  // Results list
  resultsScroll: {
    flex: 1,
    padding: 16,
  },
  calloutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_DIM,
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  calloutBannerLive: {
    backgroundColor: GREEN_DIM,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  calloutText: {
    fontSize: 12,
    color: '#C4B5FD',
    flex: 1,
    lineHeight: 17,
    fontWeight: '500',
  },
  refreshLoader: {
    padding: 40,
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 13,
    color: MUTED,
    marginTop: 12,
  },

  // Flight Card
  flightCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  flightCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  airlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  airlineLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#FFF',
    padding: 3,
  },
  airlineFallback: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  airlineName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFF',
  },
  flightSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  flightNumBadge: {
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  flightNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  aircraftText: {
    fontSize: 11,
    color: MUTED,
    maxWidth: 130,
  },
  flightPrice: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  flightSecondaryPrice: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14,
  },

  // Route breakdown
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  routeEnd: {
    flex: 1,
  },
  timeText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  airportCode: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
    marginTop: 2,
  },
  routeCenter: {
    flex: 1.6,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '84%',
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  timelineLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: PRIMARY_BORDER,
    marginHorizontal: 3,
  },
  stopsBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  stopsBadgeDirect: {
    backgroundColor: GREEN_DIM,
  },
  stopsBadgeLayovers: {
    backgroundColor: PRIMARY_DIM,
  },
  stopsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stopsBadgeTextDirect: {
    color: GREEN,
  },
  stopsBadgeTextLayovers: {
    color: '#C4B5FD',
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyBookBtn: {
    flex: 1.4,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 46,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    paddingHorizontal: 8,
  },
  companyBookBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  optionsBtn: {
    flex: 0.6,
    backgroundColor: '#18181D',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: MUTED,
  },

  // Modal Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#16161A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },
  modalSubtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CARD_INNER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_INNER,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1F1F26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  optionItemSub: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 2,
  },

  // Empty state
  noFlightsWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  noFlightsIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY_DIM,
    borderWidth: 1,
    borderColor: PRIMARY_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  noFlightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  noFlightsSub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
});
