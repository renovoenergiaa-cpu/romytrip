import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Proxy para Duffel e SerpApi: as chaves ficam só aqui (secrets), nunca no bundle do app.
// Secrets: DUFFEL_ACCESS_TOKEN, SERPAPI_KEY (supabase secrets set ...).
// @ts-ignore
const DUFFEL_TOKEN = Deno.env.get('DUFFEL_ACCESS_TOKEN') ?? '';
// @ts-ignore
const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY') ?? '';
// @ts-ignore
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// @ts-ignore
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

const IATA = /^[A-Z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CABINS = ['economy', 'business', 'first'];

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  // Exige usuário logado (a anon key sozinha passa no gateway, então validamos o JWT do usuário).
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Não autenticado' }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  try {
    switch (body?.action) {
      case 'duffel-search': {
        if (!DUFFEL_TOKEN) return json({ error: 'Provedor indisponível' }, 503);
        const { slices, passengers, cabinClass } = body;
        const slicesOk =
          Array.isArray(slices) && slices.length >= 1 && slices.length <= 2 &&
          slices.every((s: any) => IATA.test(s?.origin) && IATA.test(s?.destination) && ISO_DATE.test(s?.departure_date));
        if (!slicesOk || !Number.isInteger(passengers) || passengers < 1 || passengers > 9 || !CABINS.includes(cabinClass)) {
          return json({ error: 'Parâmetros inválidos' }, 400);
        }
        const res = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true', {
          method: 'POST',
          headers: { Authorization: `Bearer ${DUFFEL_TOKEN}`, 'Duffel-Version': 'v2', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              slices: slices.map((s: any) => ({ origin: s.origin, destination: s.destination, departure_date: s.departure_date })),
              passengers: Array.from({ length: passengers }, () => ({ type: 'adult' })),
              cabin_class: cabinClass,
            },
          }),
        });
        return json(await res.json(), res.ok ? 200 : 502);
      }

      case 'duffel-link': {
        if (!DUFFEL_TOKEN) return json({ error: 'Provedor indisponível' }, 503);
        if (!/^off_[A-Za-z0-9_]+$/.test(body.offerId ?? '')) return json({ error: 'Oferta inválida' }, 400);
        const res = await fetch('https://api.duffel.com/links/sessions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${DUFFEL_TOKEN}`, 'Duffel-Version': 'v2', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              offer_id: body.offerId,
              success_url: 'https://romy.app/booking-success',
              failure_url: 'https://romy.app/booking-failed',
              abandonment_url: 'https://romy.app/booking-abandoned',
              reference: `romy-${user.id.slice(0, 8)}-${Date.now()}`,
            },
          }),
        });
        return json(await res.json(), res.ok ? 200 : 502);
      }

      case 'serpapi-search': {
        if (!SERPAPI_KEY) return json({ error: 'Provedor indisponível' }, 503);
        const { origin, destination, outboundDate, returnDate } = body;
        if (!IATA.test(origin) || !IATA.test(destination) || !ISO_DATE.test(outboundDate) || (returnDate && !ISO_DATE.test(returnDate))) {
          return json({ error: 'Parâmetros inválidos' }, 400);
        }
        const qs = new URLSearchParams({
          engine: 'google_flights', departure_id: origin, arrival_id: destination, outbound_date: outboundDate,
          currency: 'BRL', hl: 'pt', gl: 'br', api_key: SERPAPI_KEY,
        });
        if (returnDate) qs.set('return_date', returnDate);
        const res = await fetch(`https://serpapi.com/search.json?${qs}`);
        const data = await res.json();
        delete data.search_parameters; // não devolve a api_key ao cliente
        return json(data, res.ok ? 200 : 502);
      }

      default:
        return json({ error: 'Ação desconhecida' }, 400);
    }
  } catch (e) {
    console.error('flight-proxy error:', e);
    return json({ error: 'Falha ao consultar provedor' }, 502);
  }
});
