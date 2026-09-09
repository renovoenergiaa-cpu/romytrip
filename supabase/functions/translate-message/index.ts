import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore
const DEEPL_API_KEY = Deno.env.get('DEEPL_API_KEY');
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// @ts-ignore
Deno.serve(async (req: any) => {
  // CORS configuration for Supabase Edge Functions
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    if (!DEEPL_API_KEY) {
      return new Response(JSON.stringify({ error: 'DEEPL_API_KEY is not configured.' }), { status: 500, headers });
    }

    const { text, targetLang = 'PT-BR' } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Texto não fornecido' }), { status: 400, headers });
    }

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.split('-')[0], // DeepL uses 'PT', 'EN', 'ES'
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('DeepL Error:', data);
      return new Response(JSON.stringify({ error: 'Erro ao conectar com tradutor.' }), { status: 502, headers });
    }

    const translatedText = data.translations?.[0]?.text;

    return new Response(JSON.stringify({ translatedText }), { status: 200, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
});
