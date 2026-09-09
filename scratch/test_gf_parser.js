// Parser for Google Flights HTML
function parseGoogleFlightsHtml(html) {
  const flights = [];

  // Match ds:1 callback data
  const regex = /AF_initDataCallback\(\{key: 'ds:1', hash: '[^']+', data:(.+?)(, sideChannel: \{\}\}\);|\}\);<\/script>)/s;
  const match = regex.exec(html);
  if (!match) {
    console.log('No ds:1 match');
    return [];
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    console.log('JSON parse error:', e.message);
    return [];
  }

  // Explore the data structure
  // In our inspected cb_ds_1.json:
  // data is an array: [[null, ...], [originAirports], [destAirports], [flightGroups1], [flightGroups2]]
  // Let's inspect flightGroups:
  const searchResults = data[3] || [];
  const otherResults = data[4] || [];
  const allGroups = [...searchResults, ...otherResults];

  for (const item of allGroups) {
    try {
      // Each item has structure:
      // item[0]: Flight segment details
      // item[1]: [ [null, priceNum], bookingToken/id ]
      const leg = item[0];
      if (!Array.isArray(leg)) continue;

      const carrierCode = leg[0]; // e.g. "LA" or "G3"
      const airlineName = leg[1]?.[0] || carrierCode; // e.g. "Gol" or "LATAM"
      
      const segments = leg[2] || [];
      const firstSeg = segments[0] || [];
      const flightNumber = firstSeg[20]?.[1] || ''; // e.g. "1524"
      const fullFlightCode = carrierCode && flightNumber ? `${carrierCode} ${flightNumber}` : (carrierCode || airlineName);
      
      const depAirport = leg[3]; // e.g. "GRU"
      const depDateArr = leg[4]; // [2026, 10, 15]
      const depTimeArr = leg[5]; // [4, 35] -> 04:35
      
      const arrAirport = leg[6]; // e.g. "GIG"
      const arrDateArr = leg[7]; // [2026, 10, 15]
      const arrTimeArr = leg[8]; // [5, 40] -> 05:40
      
      const durationMins = leg[9]; // 65
      const stops = segments.length > 1 ? `${segments.length - 1} parada(s)` : 'Direto';

      const priceInfo = item[1];
      const priceNum = priceInfo?.[0]?.[1] || 0; // 872
      
      const depH = String(depTimeArr?.[0] || 0).padStart(2, '0');
      const depM = String(depTimeArr?.[1] || 0).padStart(2, '0');
      const arrH = String(arrTimeArr?.[0] || 0).padStart(2, '0');
      const arrM = String(arrTimeArr?.[1] || 0).padStart(2, '0');

      const durH = Math.floor((durationMins || 0) / 60);
      const durM = (durationMins || 0) % 60;

      // Logos
      const logoMap = {
        LA: 'https://assets.duffel.com/img/airlines/for-light-background/LA.png',
        G3: 'https://assets.duffel.com/img/airlines/for-light-background/G3.png',
        AD: 'https://assets.duffel.com/img/airlines/for-light-background/AD.png',
        TP: 'https://assets.duffel.com/img/airlines/for-light-background/TP.png',
        AA: 'https://assets.duffel.com/img/airlines/for-light-background/AA.png',
        BA: 'https://assets.duffel.com/img/airlines/for-light-background/BA.png',
        IB: 'https://assets.duffel.com/img/airlines/for-light-background/IB.png',
        AF: 'https://assets.duffel.com/img/airlines/for-light-background/AF.png',
        DL: 'https://assets.duffel.com/img/airlines/for-light-background/DL.png',
        UA: 'https://assets.duffel.com/img/airlines/for-light-background/UA.png',
        CM: 'https://assets.duffel.com/img/airlines/for-light-background/CM.png',
        AV: 'https://assets.duffel.com/img/airlines/for-light-background/AV.png',
        AR: 'https://assets.duffel.com/img/airlines/for-light-background/AR.png',
        KL: 'https://assets.duffel.com/img/airlines/for-light-background/KL.png',
        LH: 'https://assets.duffel.com/img/airlines/for-light-background/LH.png',
        QR: 'https://assets.duffel.com/img/airlines/for-light-background/QR.png',
        EK: 'https://assets.duffel.com/img/airlines/for-light-background/EK.png',
        TK: 'https://assets.duffel.com/img/airlines/for-light-background/TK.png',
      };

      if (airlineName && priceNum > 0) {
        flights.push({
          airline: airlineName === 'Gol' ? 'GOL Linhas Aéreas' : airlineName === 'LATAM' ? 'LATAM Airlines' : airlineName,
          carrierCode,
          flightNumber: fullFlightCode,
          departureTime: `${depH}:${depM}`,
          arrivalTime: `${arrH}:${arrM}`,
          duration: `${durH}h ${durM}m`,
          stops,
          rawPrice: priceNum,
          price: `R$ ${priceNum.toLocaleString('pt-BR')}`,
          airlineLogo: logoMap[carrierCode] || `https://assets.duffel.com/img/airlines/for-light-background/${carrierCode}.png`,
        });
      }
    } catch (e) {
      // continue
    }
  }

  return flights;
}

async function test() {
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
  const html = await res.text();
  const parsed = parseGoogleFlightsHtml(html);
  console.log(`Parsed ${parsed.length} flights!`);
  console.log('First 5 flights:');
  console.log(JSON.stringify(parsed.slice(0, 5), null, 2));
}

test();
