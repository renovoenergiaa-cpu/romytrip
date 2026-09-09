const { searchRealFlights, buildDirectAirlineUrl, buildGoogleFlightsUrl } = require('../src/services/flightService');

async function runTest() {
  console.log('Testing flightService module...');
  const result = await searchRealFlights({
    originCode: 'GRU',
    destCode: 'GIG',
    departureDate: '15/10/2026',
    passengers: 1,
    cabinClass: 'Econômica',
  });

  console.log('Search success:', result.flights.length > 0);
  console.log('Provider:', result.provider);
  console.log('isLive:', result.isLive);
  if (result.flights.length > 0) {
    const f = result.flights[0];
    console.log('Top flight:');
    console.log(`Airline: ${f.airline} (${f.carrierCode})`);
    console.log(`Flight: ${f.flightNumber} | ${f.aircraft}`);
    console.log(`Times: ${f.departureTime} -> ${f.arrivalTime} (${f.duration})`);
    console.log(`Price: ${f.price}`);
    console.log(`Direct Booking URL: ${f.directBookingUrl}`);
    console.log(`Google Booking URL: ${f.googleBookingUrl}`);
  }
}

runTest();
