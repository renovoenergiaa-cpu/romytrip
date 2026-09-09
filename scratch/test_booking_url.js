const { searchRealFlights } = require('./dist/flightService.js');

async function testBookingLinks() {
  console.log('Testing booking URLs reachability...');
  const res = await searchRealFlights({
    originCode: 'GRU',
    destCode: 'GIG',
    departureDate: '15/10/2026',
    passengers: 1,
    cabinClass: 'Econômica',
  });

  const flight = res.flights[0];
  console.log('Testing flight:', flight.airline, flight.flightNumber);
  console.log('Direct airline URL:', flight.directBookingUrl);
  console.log('Google Flights URL:', flight.googleBookingUrl);

  const testFetch = async (name, url) => {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      console.log(`[${name}] Status: ${r.status} (OK: ${r.status >= 200 && r.status < 400})`);
    } catch (e) {
      console.log(`[${name}] Error: ${e.message}`);
    }
  };

  await testFetch('Google Flights TFS Booking URL', flight.googleBookingUrl);
  await testFetch('GOL Direct Booking URL', flight.directBookingUrl);
}

testBookingLinks();
