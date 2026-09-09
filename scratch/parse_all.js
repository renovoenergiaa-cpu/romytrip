async function run() {
  const origin = 'GRU';
  const dest = 'GIG';
  const date = '2026-10-15';
  const url = `https://www.google.com/travel/flights?q=Voos+de+${origin}+para+${dest}+em+${date}&curr=BRL&hl=pt-BR`;
  
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
  
  const bestFlights = data[2]?.[0] || [];
  const otherFlights = data[3]?.[0] || [];
  const all = [...bestFlights, ...otherFlights];

  console.log(`Total flights found: ${all.length}`);
  
  all.forEach((item, idx) => {
    try {
      const flightInfo = item[0];
      const carrierCode = flightInfo[0];
      const airlineName = flightInfo[1]?.[0] || carrierCode;
      const segments = flightInfo[2] || [];
      const firstSeg = segments[0] || [];
      const flightNumber = firstSeg[20]?.[1] || '';
      const aircraft = firstSeg[17] || '';
      
      const depTime = flightInfo[5]; // [4, 35]
      const arrTime = flightInfo[8]; // [5, 40]
      const durMins = flightInfo[9];
      const stops = segments.length > 1 ? `${segments.length - 1} parada(s)` : 'Direto';
      
      const price = item[1]?.[0]?.[1];
      const bookingToken = item[1]?.[1];
      
      const depH = String(depTime[0]).padStart(2, '0');
      const depM = String(depTime[1]).padStart(2, '0');
      const arrH = String(arrTime[0]).padStart(2, '0');
      const arrM = String(arrTime[1]).padStart(2, '0');
      
      console.log(`[Flight ${idx + 1}] ${airlineName} (${carrierCode} ${flightNumber}) | ${aircraft}`);
      console.log(`   ${depH}:${depM} -> ${arrH}:${arrM} (${durMins}m, ${stops})`);
      console.log(`   Preço: R$ ${price} | Token: ${bookingToken?.slice(0, 30)}...`);
    } catch (e) {
      console.log(`Error parsing flight ${idx + 1}:`, e.message);
    }
  });
}

run();
