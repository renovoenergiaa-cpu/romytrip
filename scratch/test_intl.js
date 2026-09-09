async function testRoute(origin, dest, date) {
  const url = `https://www.google.com/travel/flights?q=Voos+de+${origin}+para+${dest}+em+${date}&curr=BRL&hl=pt-BR`;
  console.log(`\n=== Testing ${origin} -> ${dest} on ${date} ===`);
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
    console.log('No ds:1 found');
    return;
  }
  const data = JSON.parse(match[1]);
  const bestFlights = data[2]?.[0] || [];
  const otherFlights = data[3]?.[0] || [];
  const all = [...bestFlights, ...otherFlights];
  console.log(`Found ${all.length} flights! Top 3:`);
  
  all.slice(0, 3).forEach((item, idx) => {
    const flightInfo = item[0];
    const carrierCode = flightInfo[0];
    const airlineName = flightInfo[1]?.[0] || carrierCode;
    const seg0 = flightInfo[2]?.[0] || [];
    const flightNum = seg0[22]?.[1] || '';
    const aircraft = seg0[17] || '';
    const depTime = flightInfo[5] || [];
    const arrTime = flightInfo[8] || [];
    const depH = String(depTime[0] ?? 0).padStart(2, '0');
    const depM = String(depTime[1] ?? 0).padStart(2, '0');
    const arrH = String(arrTime[0] ?? 0).padStart(2, '0');
    const arrM = String(arrTime[1] ?? 0).padStart(2, '0');
    const price = item[1]?.[0]?.[1];
    console.log(`  ${idx + 1}. ${airlineName} (${carrierCode} ${flightNum}) | ${depH}:${depM} -> ${arrH}:${arrM} | R$ ${price} | ${aircraft}`);
  });
}

async function run() {
  await testRoute('GRU', 'MIA', '2026-10-15');
  await testRoute('GRU', 'LIS', '2026-10-15');
}

run();
