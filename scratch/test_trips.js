async function testSearch(origin, dest, depDate, retDate) {
  let query = `Voos de ${origin} para ${dest} em ${depDate}`;
  if (retDate) {
    query += ` retorno ${retDate}`;
  } else {
    query += ` somente ida`;
  }
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
  console.log(`Found ${all.length} flights! Top 2:`);
  all.slice(0, 2).forEach((item, i) => {
    const info = item[0];
    const carrier = info[0];
    const name = info[1]?.[0] || carrier;
    const price = item[1]?.[0]?.[1];
    const depTime = info[5] || [];
    const arrTime = info[8] || [];
    console.log(`  [${i+1}] ${name} (${carrier}) | ${depTime[0]}:${depTime[1] ?? '00'} -> ${arrTime[0]}:${arrTime[1] ?? '00'} | R$ ${price}`);
  });
}

async function run() {
  // One-way domestic
  await testSearch('GRU', 'GIG', '2026-10-15', null);
  // Round-trip domestic
  await testSearch('GRU', 'GIG', '2026-10-15', '2026-10-22');
  // One-way international
  await testSearch('GRU', 'LIS', '2026-10-15', null);
  // Round-trip international
  await testSearch('GRU', 'MIA', '2026-10-15', '2026-10-25');
}

run();
