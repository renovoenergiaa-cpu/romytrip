async function checkDateGrid() {
  const url = `https://www.google.com/travel/flights?q=Flights+from+GRU+to+GIG+on+2026-10-15&curr=BRL&hl=pt-BR`;
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
  
  // Check data[1] or other indices for calendar / date grid prices
  console.log('Keys with arrays:');
  data.forEach((item, idx) => {
    if (Array.isArray(item) && item.length > 0) {
      const str = JSON.stringify(item);
      // look for dates like "2026-10-"
      const dateCount = (str.match(/2026-10-/g) || []).length;
      if (dateCount > 5) {
        console.log(`Index ${idx} has ${dateCount} date references! length=${item.length}`);
      }
    }
  });
}

checkDateGrid();
