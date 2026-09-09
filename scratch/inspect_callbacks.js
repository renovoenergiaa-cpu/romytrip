const fs = require('fs');

async function checkGF2() {
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
  
  // Extract all AF_initDataCallback
  const regex = /AF_initDataCallback\(\{key: '([^']+)', hash: '[^']+', data:(.+?)(, sideChannel: \{\}\}\);|\}\);<\/script>)/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1];
    const rawData = match[2];
    console.log('Key:', key, 'length:', rawData.length);
    if (rawData.includes('LATAM') || rawData.includes('Gol') || rawData.includes('Azul')) {
      console.log('Key contains airlines!', key);
      fs.writeFileSync(`scratch/cb_${key.replace(/[^a-zA-Z0-9]/g, '_')}.json`, rawData.slice(0, 10000));
    }
  }
}

checkGF2();
