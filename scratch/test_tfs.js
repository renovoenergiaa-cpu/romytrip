async function testTfs() {
  const tfs = "CAISA0JSTBoECOqoBSJwCl0KWwoDR1JVEhkyMDI2LTEwLTE1VDA0OjM1OjAwLTAzOjAwGgNHSUciGTIwMjYtMTAtMTVUMDU6NDA6MDAtMDM6MDAqAkczMgQxNTI0OgJHM0IEMTUyNEgBUgM3MzgSBAgDEAEYASgAMgUKA0dvbA==";
  const url = `https://www.google.com/travel/flights?tfs=${encodeURIComponent(tfs)}&hl=pt-BR&curr=BRL`;
  console.log('Testing URL:', url);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Length:', text.length);
  // Check if booking options are present
  const hasReservar = text.includes('Reservar') || text.includes('reservar') || text.includes('comprar') || text.includes('booking') || text.includes('voegol');
  console.log('Has booking keywords:', hasReservar);
}

testTfs();
