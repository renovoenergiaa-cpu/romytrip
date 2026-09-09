async function testEnglish(query) {
  const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=BRL&hl=pt-BR`;
  console.log(`\n=== Query: "${query}" ===`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  });
  const text = await res.text();
  const regex = /AF_initDataCallback\(\{key: 'ds:1', hash: '[^']+', data:(.+?)(, sideChannel: \{\}\}\);|\}\);<\/script>)/s;
  const match = regex.exec(text);
  if (!match) {
    console.log('No ds:1 match');
    return;
  }
  const data = JSON.parse(match[1]);
  const best = data[2]?.[0] || [];
  const other = data[3]?.[0] || [];
  const all = [...best, ...other];
  console.log(`Found ${all.length} flights!`);
  if (all.length > 0) {
    const info = all[0][0];
    const name = info[1]?.[0] || info[0];
    const price = all[0][1]?.[0]?.[1];
    console.log(`  Top flight: ${name} - R$ ${price}`);
  }
}

async function run() {
  await testEnglish('Flights from GRU to GIG on 2026-10-15');
  await testEnglish('Flights from GRU to GIG on 2026-10-15 through 2026-10-22');
  await testEnglish('Flights from GRU to MIA on 2026-10-15');
  await testEnglish('Flights from GRU to MIA on 2026-10-15 through 2026-10-25');
}

run();
