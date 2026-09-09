async function testCabin() {
  const query = 'Flights from GRU to MIA on 2026-10-15 in business class';
  const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=BRL&hl=pt-BR`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  });
  const text = await res.text();
  const regex = /AF_initDataCallback\(\{key: 'ds:1', hash: '[^']+', data:(.+?)(, sideChannel: \{\}\}\);|\}\);<\/script>)/s;
  const match = regex.exec(text);
  const data = JSON.parse(match[1]);
  const best = data[2]?.[0] || [];
  console.log(`Business class test - found: ${best.length}`);
  if (best.length > 0) {
    console.log('Top price:', best[0][1]?.[0]?.[1]);
  }
}

testCabin();
