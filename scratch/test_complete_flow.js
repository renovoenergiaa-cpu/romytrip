// Complete flow test
async function searchFlightsGoogle(origin, dest, date, returnDate) {
  let query = `Voos de ${origin} para ${dest} em ${date}`;
  if (returnDate) {
    query += ` retorno ${returnDate}`;
  }
  const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=BRL&hl=pt-BR`;
  console.log('Fetching Google Flights:', url);

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
    console.log('Could not find ds:1 data in Google Flights response');
    return [];
  }

  const data = JSON.parse(match[1]);
  const bestFlights = data[2]?.[0] || [];
  const otherFlights = data[3]?.[0] || [];
  const allGroups = [...bestFlights, ...otherFlights];

  const results = [];
  for (let i = 0; i < allGroups.length; i++) {
    const item = allGroups[i];
    try {
      const flightInfo = item[0];
      const carrierCode = flightInfo[0];
      let airlineName = flightInfo[1]?.[0] || carrierCode;
      if (airlineName === 'Gol') airlineName = 'GOL Linhas Aéreas';
      if (airlineName === 'LATAM') airlineName = 'LATAM Airlines';
      if (airlineName === 'Azul') airlineName = 'Azul Linhas Aéreas';

      const segments = flightInfo[2] || [];
      const firstSeg = segments[0] || [];
      const flightNumber = firstSeg[22]?.[1] || '';
      const aircraft = firstSeg[17] || '';

      const depTime = flightInfo[5] || [8, 0];
      const arrTime = flightInfo[8] || [10, 0];
      const durMins = flightInfo[9] || 60;
      const stops = segments.length > 1 ? `${segments.length - 1} parada(s)` : 'Direto';

      const priceNum = item[1]?.[0]?.[1];
      if (!priceNum || priceNum <= 0) continue;

      const depH = String(depTime[0] ?? 0).padStart(2, '0');
      const depM = String(depTime[1] ?? 0).padStart(2, '0');
      const arrH = String(arrTime[0] ?? 0).padStart(2, '0');
      const arrM = String(arrTime[1] ?? 0).padStart(2, '0');

      const durH = Math.floor(durMins / 60);
      const durM = durMins % 60;

      // Extract TFS booking string
      // In item[8] or JSON string, Google Flights provides the base64 tfs for this exact itinerary
      let tfsString = '';
      try {
        const itemStr = JSON.stringify(item);
        const tfsMatch = itemStr.match(/\"(CAISA0[^\"]+)\"/);
        if (tfsMatch) {
          tfsString = tfsMatch[1];
        }
      } catch (_) {}

      // Direct booking URL:
      // If tfs exists, https://www.google.com/travel/flights?tfs=... opens Google Flights with this exact flight selected and checkout buttons
      const directGoogleBookingUrl = tfsString
        ? `https://www.google.com/travel/flights?tfs=${encodeURIComponent(tfsString)}&hl=pt-BR&curr=BRL`
        : `https://www.google.com/travel/flights?q=${encodeURIComponent(`Voos de ${origin} para ${dest} em ${date} com ${airlineName}`)}&hl=pt-BR&curr=BRL`;

      // Direct airline booking URLs
      let directAirlineUrl = '';
      if (carrierCode === 'LA') {
        directAirlineUrl = `https://www.latamairlines.com/br/pt/oferta-voos?origin=${origin}&destination=${dest}&outbound=${date}T00:00:00.000Z`;
      } else if (carrierCode === 'G3') {
        const dParts = date.split('-');
        const formattedDate = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
        directAirlineUrl = `https://b2c.voegol.com.br/compra/busca-parceiros?de=${origin}&para=${dest}&ida=${formattedDate}&adultos=1`;
      } else if (carrierCode === 'AD') {
        const dParts = date.split('-');
        const formattedDate = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
        directAirlineUrl = `https://www.voeazul.com.br/br/pt/home/selecao-voo?c[0].ds=${origin}&c[0].as=${dest}&c[0].std=${formattedDate}&p[0].t=ADT&p[0].c=1`;
      } else if (carrierCode === 'TP') {
        directAirlineUrl = `https://www.flytap.com/pt-br/reserva/voos?from=${origin}&to=${dest}&departureDate=${date}`;
      } else {
        directAirlineUrl = directGoogleBookingUrl;
      }

      results.push({
        id: `gf-${i}`,
        airline: airlineName,
        carrierCode,
        flightNumber: flightNumber ? `${carrierCode} ${flightNumber}` : carrierCode,
        aircraft,
        departureTime: `${depH}:${depM}`,
        arrivalTime: `${arrH}:${arrM}`,
        duration: `${durH}h ${durM}m`,
        stops,
        price: `R$ ${priceNum.toLocaleString('pt-BR')}`,
        rawPrice: priceNum,
        directBookingUrl: directAirlineUrl,
        googleBookingUrl: directGoogleBookingUrl,
      });
    } catch (err) {
      // skip malformed
    }
  }

  return results;
}

async function test() {
  const flights = await searchFlightsGoogle('GRU', 'GIG', '2026-10-15');
  console.log(`Found ${flights.length} flights!`);
  if (flights.length > 0) {
    console.log('Sample flight:', JSON.stringify(flights[0], null, 2));
  }
}

test();
