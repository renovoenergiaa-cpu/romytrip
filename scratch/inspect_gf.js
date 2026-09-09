const fs = require('fs');

async function checkGF() {
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
  
  // Find AF_initDataCallback or data patterns
  const callbacks = text.match(/AF_initDataCallback\(\{key: 'ds:[^}]+\}/g);
  console.log('Found callbacks:', callbacks?.length);

  // Look for currency / price patterns like R$\s?[\d.,]+
  const prices = text.match(/R\$\s?[\d.,]+/g);
  console.log('Sample prices in response:', prices?.slice(0, 15));

  // Look for airline flight numbers
  const flightMatches = text.match(/(LA|G3|AD)\s?\d{3,4}/g);
  console.log('Sample flight numbers in response:', flightMatches?.slice(0, 15));
}

checkGF();
