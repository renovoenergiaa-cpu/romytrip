async function testBookingLink() {
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
  
  const flight = data[2][0][0]; // first flight
  const token = flight[1]?.[1];
  console.log('Token:', token);
  
  // Also check if there's any encoded tfs string in item
  console.log('Flight item stringified:');
  const str = JSON.stringify(flight);
  const tfsMatches = str.match(/\/travel\/flights[^\"]+/g);
  console.log('tfs matches:', tfsMatches);

  // Check item[1] keys
  console.log('item[1]:', JSON.stringify(flight[1]));
  console.log('item[6]:', JSON.stringify(flight[6]));
  console.log('item[7]:', JSON.stringify(flight[7]));
}

testBookingLink();
