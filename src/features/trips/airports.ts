// Cidade -> código IATA do aeroporto principal. Só o que sabemos: cidade fora da lista devolve null
// (antes o app inventava um código com as 3 primeiras letras da cidade).
const AIRPORTS: Record<string, string> = {
  'são paulo': 'GRU', 'sao paulo': 'GRU', guarulhos: 'GRU', congonhas: 'CGH',
  'rio de janeiro': 'GIG', galeão: 'GIG', galeao: 'GIG', 'santos dumont': 'SDU',
  salvador: 'SSA', recife: 'REC', fortaleza: 'FOR', 'porto alegre': 'POA',
  'belo horizonte': 'CNF', confins: 'CNF', brasília: 'BSB', brasilia: 'BSB', curitiba: 'CWB',
  manaus: 'MAO', natal: 'NAT', florianópolis: 'FLN', florianopolis: 'FLN',
  miami: 'MIA', orlando: 'MCO', 'nova york': 'JFK', 'new york': 'JFK',
  lisboa: 'LIS', porto: 'OPO', madri: 'MAD', madrid: 'MAD', paris: 'CDG', londres: 'LHR', roma: 'FCO',
  'buenos aires': 'EZE', santiago: 'SCL', montevidéu: 'MVD', montevideu: 'MVD', lima: 'LIM',
  cancun: 'CUN', cancún: 'CUN', 'punta cana': 'PUJ', bariloche: 'BRC', dubai: 'DXB',
};

/** "Lisboa, Portugal" -> "LIS". Aceita também um código digitado (ex.: "GRU"). */
export function airportCode(place: string): string | null {
  const clean = place.split(',')[0].trim().toLowerCase();
  if (!clean) return null;
  if (/^[a-z]{3}$/.test(clean) && Object.values(AIRPORTS).includes(clean.toUpperCase())) return clean.toUpperCase();
  const key = Object.keys(AIRPORTS).find((k) => k === clean);
  return key ? AIRPORTS[key] : null;
}

/** "2026-12-05" -> "05/12/2026" (formato que o serviço de voos espera). */
export const isoToBr = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
};
