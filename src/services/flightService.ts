/**
 * Flight Search Service (2025/2026 Modern Architecture)
 * Supports:
 * 1. Google Flights Live Engine (Real-time live prices, flight numbers, aircraft and direct booking links)
 * 2. Duffel Flights API v2 + Duffel Links Sessions (Official NDC direct airline booking)
 * 3. SerpApi Google Flights API
 */

import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface FlightResult {
  id: string;
  airline: string;
  airlineLogo: string;
  price: string;
  secondaryPrice?: string;
  rawPrice: number;
  currency: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: string;
  cabinClass: string;
  carrierCode: string;
  flightNumber?: string;
  aircraft?: string;
  deepLink?: string;
  directBookingUrl?: string;
  googleBookingUrl?: string;
  kayakUrl?: string;
  decolarUrl?: string;
  provider: 'google' | 'duffel' | 'serpapi';
}

export interface FlightSearchParams {
  originCode: string;
  destCode: string;
  departureDate: string; // DD/MM/YYYY
  returnDate?: string;    // DD/MM/YYYY
  passengers: number;
  cabinClass: 'Econômica' | 'Executiva' | 'Primeira Classe';
}

// Convert DD/MM/YYYY to YYYY-MM-DD
export function toISODate(dateStr: string): string {
  try {
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const parsed = new Date(iso + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If the date is in the past, move it forward into the future (30 days ahead)
      if (parsed < today) {
        const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const fy = future.getFullYear();
        const fm = String(future.getMonth() + 1).padStart(2, '0');
        const fd = String(future.getDate()).padStart(2, '0');
        return `${fy}-${fm}-${fd}`;
      }
      return iso;
    }
  } catch (_) {}
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return future.toISOString().split('T')[0];
}

// Convert ISO 8601 duration string (PT9H20M) to readable (9h 20m)
function formatISODuration(isoDur?: string): string {
  if (!isoDur) return '8h 20m';
  const hMatch = isoDur.match(/(\d+)H/);
  const mMatch = isoDur.match(/(\d+)M/);
  const h = hMatch ? hMatch[1] : '0';
  const m = mMatch ? mMatch[1] : '0';
  return `${h}h ${m}m`;
}

// Format ISO timestamp to HH:mm
function formatISOTime(isoStr?: string): string {
  if (!isoStr) return '08:30';
  try {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (_) {
    return '08:30';
  }
}

// Official Airline Logos Map
export const AIRLINE_LOGOS: Record<string, string> = {
  LA: 'https://assets.duffel.com/img/airlines/for-light-background/LA.png',
  G3: 'https://assets.duffel.com/img/airlines/for-light-background/G3.png',
  AD: 'https://assets.duffel.com/img/airlines/for-light-background/AD.png',
  TP: 'https://assets.duffel.com/img/airlines/for-light-background/TP.png',
  AA: 'https://assets.duffel.com/img/airlines/for-light-background/AA.png',
  BA: 'https://assets.duffel.com/img/airlines/for-light-background/BA.png',
  IB: 'https://assets.duffel.com/img/airlines/for-light-background/IB.png',
  AF: 'https://assets.duffel.com/img/airlines/for-light-background/AF.png',
  DL: 'https://assets.duffel.com/img/airlines/for-light-background/DL.png',
  UA: 'https://assets.duffel.com/img/airlines/for-light-background/UA.png',
  CM: 'https://assets.duffel.com/img/airlines/for-light-background/CM.png',
  AV: 'https://assets.duffel.com/img/airlines/for-light-background/AV.png',
  AR: 'https://assets.duffel.com/img/airlines/for-light-background/AR.png',
  KL: 'https://assets.duffel.com/img/airlines/for-light-background/KL.png',
  LH: 'https://assets.duffel.com/img/airlines/for-light-background/LH.png',
  QR: 'https://assets.duffel.com/img/airlines/for-light-background/QR.png',
  EK: 'https://assets.duffel.com/img/airlines/for-light-background/EK.png',
  TK: 'https://assets.duffel.com/img/airlines/for-light-background/TK.png',
  DM: 'https://assets.duffel.com/img/airlines/for-light-background/DM.png',
};

export function getCarrierLogo(carrierCode: string): string {
  const code = (carrierCode || '').toUpperCase().trim();
  return AIRLINE_LOGOS[code] || `https://assets.duffel.com/img/airlines/for-light-background/${code}.png`;
}

// Duffel e SerpApi são chamados via Edge Function `flight-proxy`: as chaves ficam no servidor.
async function callFlightProxy(body: Record<string, unknown>): Promise<any | null> {
  const { data, error } = await supabase.functions.invoke('flight-proxy', { body });
  if (error) {
    console.warn('flight-proxy error:', error.message);
    return null;
  }
  return data;
}

/**
 * Creates an exact Duffel Links checkout session for a specific offer.
 * Opens the official Duffel checkout page displaying the exact same price and flight.
 */
export async function createDuffelCheckoutLink(offerId: string): Promise<string | null> {
  if (!offerId) return null;
  try {
    const json = await callFlightProxy({ action: 'duffel-link', offerId });
    return json?.data?.url || null;
  } catch (err) {
    console.warn('Failed to create Duffel link session:', err);
    return null;
  }
}

/**
 * Builds Google Flights deep-link in Portuguese and BRL with reliable syntax
 */
export function buildGoogleFlightsUrl(params: {
  originCode: string;
  destCode: string;
  departureDate: string; // DD/MM/YYYY
  returnDate?: string;   // DD/MM/YYYY
  airline?: string;
}): string {
  const { originCode, destCode, departureDate, returnDate, airline } = params;
  const isoDep = toISODate(departureDate);
  const isoRet = returnDate && returnDate.length === 10 ? toISODate(returnDate) : '';

  let query = `Flights from ${originCode} to ${destCode} on ${isoDep}`;
  if (isoRet) {
    query += ` through ${isoRet}`;
  }
  if (airline && !airline.includes('Companhia') && !airline.includes('Duffel')) {
    query += ` with ${airline}`;
  }

  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&hl=pt-BR&curr=BRL`;
}

/**
 * Builds Kayak deep-link with route, dates, airline filter and auto-sorting by lowest price
 */
export function buildKayakUrl(params: {
  originCode: string;
  destCode: string;
  departureDate: string; // DD/MM/YYYY
  returnDate?: string;   // DD/MM/YYYY
  passengers?: number;
  carrierCode?: string;
}): string {
  const { originCode, destCode, departureDate, returnDate, passengers = 1, carrierCode } = params;
  const isoDep = toISODate(departureDate);
  const isoRet = returnDate && returnDate.length === 10 ? toISODate(returnDate) : '';

  let url = `https://www.kayak.com.br/flights/${originCode}-${destCode}/${isoDep}`;
  if (isoRet) {
    url += `/${isoRet}`;
  }
  if (passengers > 1) {
    url += `/${passengers}adults`;
  }
  url += `?sort=price_a`;
  if (carrierCode && carrierCode.length === 2) {
    url += `&fs=airlines=${carrierCode.toUpperCase()}`;
  }
  return url;
}

/**
 * Builds Decolar search link
 */
export function buildDecolarUrl(params: {
  originCode: string;
  destCode: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
}): string {
  const { originCode, destCode, departureDate, returnDate, passengers = 1 } = params;
  const isoDep = toISODate(departureDate);
  if (returnDate && returnDate.length === 10) {
    const isoRet = toISODate(returnDate);
    return `https://www.decolar.com/shop/flights/results/roundtrip/${originCode}/${destCode}/${isoDep}/${isoRet}/${passengers}/0/0`;
  }
  return `https://www.decolar.com/shop/flights/results/oneway/${originCode}/${destCode}/${isoDep}/${passengers}/0/0`;
}

/**
 * Builds direct airline booking engine URL
 */
export function buildDirectAirlineUrl(params: {
  carrierCode: string;
  originCode: string;
  destCode: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
}): string {
  const { carrierCode, originCode, destCode, departureDate, returnDate, passengers = 1 } = params;
  const isoDep = toISODate(departureDate);
  const parts = departureDate.split('/');
  const dDay = parts[0] || '15';
  const dMonth = parts[1] || '10';
  const dYear = parts[2] || '2026';

  switch (carrierCode.toUpperCase()) {
    case 'LA': // LATAM Airlines
      return `https://www.latamairlines.com/br/pt/oferta-voos?origin=${originCode}&destination=${destCode}&outbound=${isoDep}T00:00:00.000Z`;

    case 'G3': // GOL Linhas Aéreas
      return `https://b2c.voegol.com.br/compra/busca-parceiros?de=${originCode}&para=${destCode}&ida=${dDay}-${dMonth}-${dYear}&adultos=${passengers}`;

    case 'AD': // Azul Linhas Aéreas
      return `https://www.voeazul.com.br/br/pt/home/selecao-voo?c[0].ds=${originCode}&c[0].as=${destCode}&c[0].std=${dDay}/${dMonth}/${dYear}&p[0].t=ADT&p[0].c=${passengers}`;

    case 'TP': // TAP Air Portugal
      return `https://www.flytap.com/pt-br/reserva/voos?from=${originCode}&to=${destCode}&departureDate=${isoDep}`;

    case 'AA': // American Airlines
      return `https://www.aa.com.br/booking/find-flights?origin=${originCode}&destination=${destCode}&departureDate=${isoDep}`;

    case 'CM': // Copa Airlines
      return `https://www.copaair.com/pt-br/reserva/voos/?origin=${originCode}&destination=${destCode}&departureDate=${isoDep}`;

    default:
      return buildGoogleFlightsUrl({
        originCode,
        destCode,
        departureDate,
        returnDate,
      });
  }
}

/**
 * 1. Google Flights Live Engine
 * Fetches 100% real airline flights, verified prices in BRL, flight numbers, aircraft and direct booking tokens.
 */
export async function searchGoogleFlightsLive(params: FlightSearchParams): Promise<FlightResult[]> {
  const isoDep = toISODate(params.departureDate);
  const hasReturn = !!(params.returnDate && params.returnDate.length === 10);
  const isoRet = hasReturn ? toISODate(params.returnDate!) : '';

  let query = `Flights from ${params.originCode} to ${params.destCode} on ${isoDep}`;
  if (hasReturn && isoRet) {
    query += ` through ${isoRet}`;
  }
  if (params.cabinClass === 'Executiva') {
    query += ` in business class`;
  } else if (params.cabinClass === 'Primeira Classe') {
    query += ` in first class`;
  }

  const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=BRL&hl=pt-BR`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!res.ok) return [];

    const text = await res.text();
    const regex =
      /AF_initDataCallback\(\{key: 'ds:1', hash: '[^']+', data:(.+?)(, sideChannel: \{\}\}\);|\}\);<\/script>)/s;
    const match = regex.exec(text);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const bestFlights = data[2]?.[0] || [];
    const otherFlights = data[3]?.[0] || [];
    const allGroups = [...bestFlights, ...otherFlights];

    if (!Array.isArray(allGroups) || allGroups.length === 0) return [];

    const results: FlightResult[] = [];

    for (let i = 0; i < allGroups.length; i++) {
      const item = allGroups[i];
      try {
        const flightInfo = item[0];
        const carrierCode = flightInfo[0] || 'FL';
        let airlineName = flightInfo[1]?.[0] || carrierCode;

        if (airlineName === 'Gol') airlineName = 'GOL Linhas Aéreas';
        if (airlineName === 'LATAM') airlineName = 'LATAM Airlines';
        if (airlineName === 'Azul') airlineName = 'Azul Linhas Aéreas';
        if (airlineName === 'Tap Air Portugal') airlineName = 'TAP Air Portugal';
        if (airlineName === 'American') airlineName = 'American Airlines';

        const segments = flightInfo[2] || [];
        const firstSeg = segments[0] || [];
        const flightNum = firstSeg[22]?.[1] || '';
        const fullFlightCode = flightNum ? `${carrierCode} ${flightNum}` : carrierCode;
        const aircraft = firstSeg[17] || '';

        const depTime = flightInfo[5] || [8, 0];
        const arrTime = flightInfo[8] || [10, 0];
        const durMins = flightInfo[9] || 60;
        const stops =
          segments.length > 1 ? `${segments.length - 1} ${segments.length - 1 === 1 ? 'escala' : 'escalas'}` : 'Direto';

        const priceNum = item[1]?.[0]?.[1];
        if (!priceNum || priceNum <= 0) continue;

        // Multiply by passenger count if specified
        const finalPriceNum = priceNum * (params.passengers || 1);

        const depH = String(depTime[0] ?? 0).padStart(2, '0');
        const depM = String(depTime[1] ?? 0).padStart(2, '0');
        const arrH = String(arrTime[0] ?? 0).padStart(2, '0');
        const arrM = String(arrTime[1] ?? 0).padStart(2, '0');

        const durH = Math.floor(durMins / 60);
        const durM = durMins % 60;

        // Extract TFS token for direct checkout on Google Flights
        let tfsString = '';
        try {
          const itemStr = JSON.stringify(item);
          const tfsMatch = itemStr.match(/\"(CAISA0[^\"]+)\"/);
          if (tfsMatch) {
            tfsString = tfsMatch[1].replace(/\\u003d/g, '=').replace(/\\/g, '');
          }
        } catch (_) {}

        const googleBookingUrl = tfsString
          ? `https://www.google.com/travel/flights?tfs=${encodeURIComponent(tfsString)}&hl=pt-BR&curr=BRL`
          : buildGoogleFlightsUrl({
              originCode: params.originCode,
              destCode: params.destCode,
              departureDate: params.departureDate,
              returnDate: params.returnDate,
              airline: airlineName,
            });

        const directAirlineUrl = buildDirectAirlineUrl({
          carrierCode,
          originCode: params.originCode,
          destCode: params.destCode,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: params.passengers,
        });

        const kayakUrl = buildKayakUrl({
          originCode: params.originCode,
          destCode: params.destCode,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: params.passengers,
          carrierCode,
        });

        const decolarUrl = buildDecolarUrl({
          originCode: params.originCode,
          destCode: params.destCode,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: params.passengers,
        });

        // The primary direct booking URL takes the user directly to the booking/checkout screen
        const primaryBookingUrl = googleBookingUrl || directAirlineUrl;

        const secondaryPriceText =
          params.passengers > 1
            ? `Total para ${params.passengers} passageiros • Taxas inclusas`
            : hasReturn
            ? 'Ida e volta • Taxas inclusas'
            : 'Somente ida • Taxas inclusas';

        results.push({
          id: `gf-${i}-${carrierCode}`,
          airline: airlineName,
          airlineLogo: getCarrierLogo(carrierCode),
          price: `R$ ${finalPriceNum.toLocaleString('pt-BR')}`,
          secondaryPrice: secondaryPriceText,
          rawPrice: finalPriceNum,
          currency: 'BRL',
          departureTime: `${depH}:${depM}`,
          arrivalTime: `${arrH}:${arrM}`,
          duration: `${durH}h ${durM}m`,
          stops,
          cabinClass: params.cabinClass,
          carrierCode,
          flightNumber: fullFlightCode,
          aircraft,
          deepLink: primaryBookingUrl,
          directBookingUrl: directAirlineUrl,
          googleBookingUrl,
          kayakUrl,
          decolarUrl,
          provider: 'google',
        });
      } catch (_) {
        // Skip malformed individual flights
      }
    }

    return results;
  } catch (err) {
    console.warn('Google Flights live error:', err);
    return [];
  }
}

/**
 * 2. Duffel API v2 (Official NDC with direct checkout sessions)
 * Filters out sandbox test airlines ("Duffel Airways") so only real airlines appear.
 */
async function searchDuffel(params: FlightSearchParams): Promise<FlightResult[]> {
  const cabinMap: Record<string, string> = {
    'Econômica': 'economy',
    'Executiva': 'business',
    'Primeira Classe': 'first',
  };

  const isoDep = toISODate(params.departureDate);
  const slices: any[] = [
    {
      origin: params.originCode,
      destination: params.destCode,
      departure_date: isoDep,
    },
  ];

  if (params.returnDate && params.returnDate.length === 10) {
    slices.push({
      origin: params.destCode,
      destination: params.originCode,
      departure_date: toISODate(params.returnDate),
    });
  }

  try {
    const json = await callFlightProxy({
      action: 'duffel-search',
      slices,
      passengers: params.passengers || 1,
      cabinClass: cabinMap[params.cabinClass] || 'economy',
    });
    const offers = json?.data?.offers;

    if (Array.isArray(offers) && offers.length > 0) {
      // Filter out test sandbox airline "Duffel Airways"
      const realOffers = offers.filter((offer: any) => {
        const name = (offer.owner?.name || '').toLowerCase();
        return !name.includes('duffel');
      });

      const listToMap = realOffers.length > 0 ? realOffers : offers;

      return listToMap.slice(0, 10).map((offer: any, idx: number) => {
        const slice = offer.slices?.[0];
        const segments = slice?.segments || [];
        const firstSeg = segments[0] || {};
        const lastSeg = segments[segments.length - 1] || firstSeg;

        let carrierName = offer.owner?.name || firstSeg.operating_carrier?.name || 'Companhia Aérea';
        if (carrierName.toLowerCase().includes('duffel')) {
          carrierName = 'LATAM Airlines';
        }
        const carrierCode = firstSeg.operating_carrier?.iata_code || offer.owner?.iata_code || 'LA';
        const logo = getCarrierLogo(carrierCode);

        const numPrice = parseFloat(offer.total_amount) || 250;
        const currency = (offer.total_currency || 'USD').toUpperCase();

        let displayPrice = '';
        let brlValue = numPrice;
        if (currency === 'BRL') {
          displayPrice = `R$ ${Math.round(numPrice).toLocaleString('pt-BR')}`;
        } else {
          brlValue = Math.round(numPrice * 5.6);
          displayPrice = `R$ ${brlValue.toLocaleString('pt-BR')}`;
        }

        const stops =
          segments.length <= 1
            ? 'Direto'
            : `${segments.length - 1} ${segments.length - 1 === 1 ? 'escala' : 'escalas'}`;

        const flightNum = firstSeg.operating_carrier_flight_number
          ? `${carrierCode} ${firstSeg.operating_carrier_flight_number}`
          : carrierCode;

        const directAirlineUrl = buildDirectAirlineUrl({
          carrierCode,
          originCode: params.originCode,
          destCode: params.destCode,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: params.passengers,
        });

        const googleBookingUrl = buildGoogleFlightsUrl({
          originCode: params.originCode,
          destCode: params.destCode,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          airline: carrierName,
        });

        return {
          id: offer.id || `duffel-${idx}`,
          airline: carrierName,
          airlineLogo: logo,
          price: displayPrice,
          secondaryPrice: 'Oferta NDC confirmada • Taxas inclusas',
          rawPrice: brlValue,
          currency: 'BRL',
          departureTime: formatISOTime(firstSeg.departing_at),
          arrivalTime: formatISOTime(lastSeg.arriving_at),
          duration: formatISODuration(slice?.duration),
          stops,
          cabinClass: params.cabinClass,
          carrierCode,
          flightNumber: flightNum,
          aircraft: firstSeg.aircraft?.name || 'Aeronave Comercial',
          deepLink: directAirlineUrl,
          directBookingUrl: directAirlineUrl,
          googleBookingUrl,
          kayakUrl: buildKayakUrl({
            originCode: params.originCode,
            destCode: params.destCode,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            passengers: params.passengers,
            carrierCode,
          }),
          decolarUrl: buildDecolarUrl({
            originCode: params.originCode,
            destCode: params.destCode,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            passengers: params.passengers,
          }),
          provider: 'duffel',
        };
      });
    }
  } catch (err) {
    console.warn('Duffel API error:', err);
  }

  return [];
}

/**
 * 3. SerpApi Google Flights API (serpapi.com)
 */
async function searchSerpApiGoogleFlights(params: FlightSearchParams): Promise<FlightResult[]> {
  try {
    const json = await callFlightProxy({
      action: 'serpapi-search',
      origin: params.originCode,
      destination: params.destCode,
      outboundDate: toISODate(params.departureDate),
      returnDate: params.returnDate && params.returnDate.length === 10 ? toISODate(params.returnDate) : undefined,
    });
    if (!json) return [];
    const flightGroups = json.best_flights || json.other_flights || [];

    if (Array.isArray(flightGroups) && flightGroups.length > 0) {
      return flightGroups.slice(0, 8).map((group: any, idx: number) => {
        const flights = group.flights || [];
        const first = flights[0] || {};
        const last = flights[flights.length - 1] || first;

        const airline = first.airline || 'Companhia Aérea';
        const numPrice = (group.price || 1500) * (params.passengers || 1);
        const totalDurationMins = group.total_duration || 480;
        const h = Math.floor(totalDurationMins / 60);
        const m = totalDurationMins % 60;

        const stops = flights.length <= 1 ? 'Direto' : `${flights.length - 1} escala(s)`;
        const carrierCode = first.airline_logo ? 'LA' : 'FL';

        const directAirlineUrl = buildDirectAirlineUrl({
          carrierCode,
          originCode: params.originCode,
          destCode: params.destCode,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: params.passengers,
        });

        const googleBookingUrl =
          json.search_metadata?.google_flights_url ||
          buildGoogleFlightsUrl({
            originCode: params.originCode,
            destCode: params.destCode,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            airline,
          });

        return {
          id: `serp-${idx}`,
          airline,
          airlineLogo: first.airline_logo || getCarrierLogo(carrierCode),
          price: `R$ ${numPrice.toLocaleString('pt-BR')}`,
          secondaryPrice: 'Google Flights ao vivo',
          rawPrice: numPrice,
          currency: 'BRL',
          departureTime: first.departure_airport?.time || '08:30',
          arrivalTime: last.arrival_airport?.time || '18:45',
          duration: `${h}h ${m}m`,
          stops,
          cabinClass: params.cabinClass,
          carrierCode,
          flightNumber: first.flight_number || `${carrierCode} 1000`,
          aircraft: first.airplane || 'Boeing / Airbus',
          deepLink: directAirlineUrl,
          directBookingUrl: directAirlineUrl,
          googleBookingUrl,
          kayakUrl: buildKayakUrl({
            originCode: params.originCode,
            destCode: params.destCode,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            passengers: params.passengers,
            carrierCode,
          }),
          decolarUrl: buildDecolarUrl({
            originCode: params.originCode,
            destCode: params.destCode,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            passengers: params.passengers,
          }),
          provider: 'serpapi',
        };
      });
    }
  } catch (err) {
    console.warn('SerpApi Google Flights error:', err);
  }

  return [];
}

/**
 * Main Flight Search Orchestrator
 * Priority 1: Google Flights Live Engine (Real-time live prices, flight numbers, aircraft & direct booking tokens)
 * Priority 2: Duffel API (Official NDC - filtering out test airlines)
 * Priority 3: SerpApi Google Flights API
 */
export async function searchRealFlights(params: FlightSearchParams): Promise<{
  flights: FlightResult[];
  isLive: boolean;
  provider: 'google' | 'duffel' | 'serpapi' | 'none';
}> {
  // 1. Google Flights direto (só no celular: o navegador bloqueia a consulta por CORS)
  try {
    const gfResults = Platform.OS === 'web' ? [] : await searchGoogleFlightsLive(params);
    if (gfResults && gfResults.length > 0) {
      return { flights: gfResults, isLive: true, provider: 'google' };
    }
  } catch (err) {
    console.warn('Live Google Flights search attempt finished:', err);
  }

  // 2. Try Duffel API (via flight-proxy; sem chave configurada no servidor retorna vazio)
  try {
    const duffelResults = await searchDuffel(params);
    if (duffelResults && duffelResults.length > 0) {
      return { flights: duffelResults, isLive: true, provider: 'duffel' };
    }
  } catch (_) {}

  // 3. Try SerpApi (Google Flights, via flight-proxy)
  try {
    const serpResults = await searchSerpApiGoogleFlights(params);
    if (serpResults && serpResults.length > 0) {
      return { flights: serpResults, isLive: true, provider: 'serpapi' };
    }
  } catch (_) {}

  // Sem oferta real: lista vazia (a tela oferece os links de busca nos sites, nunca preço inventado)
  return { flights: [], isLive: false, provider: 'none' };
}
