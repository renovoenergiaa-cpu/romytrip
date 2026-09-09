async function run() {
  const url = `https://www.google.com/travel/flights?q=Voos+de+GRU+para+GIG+em+2026-10-15&curr=BRL&hl=pt-BR`;
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
  
  const flight = data[2][0][0][0]; // first best flight
  console.log('Flight 0 keys/values:');
  flight.forEach((v, i) => {
    console.log(`[${i}] =`, JSON.stringify(v)?.slice(0, 100));
  });
  
  const seg0 = flight[2][0];
  console.log('\nSegment 0 keys/values:');
  seg0.forEach((v, i) => {
    console.log(`seg[${i}] =`, JSON.stringify(v)?.slice(0, 100));
  });
}

run();
