// Test if there are public or accessible flight data endpoints
async function testGoogleFlightsScrape() {
  const origin = 'GRU';
  const dest = 'GIG';
  const date = '2026-10-15';
  
  // Test Google Flights Travel API or query
  const url = `https://www.google.com/travel/flights?q=Voos+de+${origin}+para+${dest}+em+${date}&curr=BRL&hl=pt-BR`;
  console.log('Testing Google Flights URL:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    console.log('Google Flights status:', res.status);
    const text = await res.text();
    console.log('Text length:', text.length);
    // Look for airline names or prices in response
    const hasLATAM = text.includes('LATAM');
    const hasGOL = text.includes('Gol') || text.includes('GOL');
    const hasAzul = text.includes('Azul');
    console.log({ hasLATAM, hasGOL, hasAzul });
  } catch (err) {
    console.error('GF error:', err.message);
  }
}

testGoogleFlightsScrape();
