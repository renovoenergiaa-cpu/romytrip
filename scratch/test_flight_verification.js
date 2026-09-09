// Verification script for Proxima Viagem flight functionality
const {
  searchGoogleFlightsLive,
  searchRealFlights,
  buildDirectAirlineUrl,
  buildGoogleFlightsUrl,
  buildKayakUrl,
  buildDecolarUrl,
  toISODate,
} = require('./dist/flightService.js');

async function runTests() {
  console.log('=====================================================');
  console.log('  PROXIMA VIAGEM - AUTOMATED VERIFICATION SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Date conversion
  const iso = toISODate('15/10/2026');
  assert(iso === '2026-10-15', 'toISODate formats DD/MM/YYYY to YYYY-MM-DD');

  // 2. Direct Airline URL Builders
  const latamUrl = buildDirectAirlineUrl({
    carrierCode: 'LA',
    originCode: 'GRU',
    destCode: 'GIG',
    departureDate: '15/10/2026',
  });
  assert(latamUrl.includes('latamairlines.com') && latamUrl.includes('GRU') && latamUrl.includes('GIG'), 'LATAM direct booking URL generated correctly');

  const golUrl = buildDirectAirlineUrl({
    carrierCode: 'G3',
    originCode: 'GRU',
    destCode: 'GIG',
    departureDate: '15/10/2026',
    passengers: 2,
  });
  assert(golUrl.includes('voegol.com.br') && golUrl.includes('adultos=2'), 'GOL direct booking URL generated correctly with passenger count');

  const azulUrl = buildDirectAirlineUrl({
    carrierCode: 'AD',
    originCode: 'GRU',
    destCode: 'GIG',
    departureDate: '15/10/2026',
  });
  assert(azulUrl.includes('voeazul.com.br') && azulUrl.includes('GRU'), 'Azul direct booking URL generated correctly');

  const tapUrl = buildDirectAirlineUrl({
    carrierCode: 'TP',
    originCode: 'GRU',
    destCode: 'LIS',
    departureDate: '15/10/2026',
  });
  assert(tapUrl.includes('flytap.com') && tapUrl.includes('LIS'), 'TAP direct booking URL generated correctly');

  console.log('\n--- Testing Domestic Live Search (GRU -> GIG) ---');
  try {
    const resDom = await searchRealFlights({
      originCode: 'GRU',
      destCode: 'GIG',
      departureDate: '15/10/2026',
      passengers: 1,
      cabinClass: 'Econômica',
    });

    assert(resDom.flights.length > 0, `Domestic search returned ${resDom.flights.length} flights`);
    assert(resDom.isLive === true, 'Domestic search used LIVE real-time engine');
    assert(['google', 'duffel'].includes(resDom.provider), `Provider is real-time (${resDom.provider})`);

    const topDom = resDom.flights[0];
    console.log(`Top Flight: ${topDom.airline} (${topDom.flightNumber}) | ${topDom.departureTime} -> ${topDom.arrivalTime} | ${topDom.price}`);
    assert(topDom.rawPrice > 100, `Real domestic price is valid: ${topDom.price}`);
    assert(topDom.googleBookingUrl && topDom.googleBookingUrl.includes('google.com/travel/flights'), 'Direct Google booking URL exists');
    assert(topDom.directBookingUrl && topDom.directBookingUrl.length > 10, 'Direct airline booking URL exists');
  } catch (err) {
    console.error('Domestic test error:', err);
    failed++;
  }

  console.log('\n--- Testing International Live Search (GRU -> LIS) ---');
  try {
    const resIntl = await searchRealFlights({
      originCode: 'GRU',
      destCode: 'LIS',
      departureDate: '15/10/2026',
      returnDate: '25/10/2026',
      passengers: 1,
      cabinClass: 'Econômica',
    });

    assert(resIntl.flights.length > 0, `International search returned ${resIntl.flights.length} flights`);
    assert(resIntl.isLive === true, 'International search used LIVE real-time engine');

    const topIntl = resIntl.flights[0];
    console.log(`Top Flight: ${topIntl.airline} (${topIntl.flightNumber}) | ${topIntl.departureTime} -> ${topIntl.arrivalTime} | ${topIntl.price}`);
    assert(topIntl.rawPrice > 1000, `Real international price is valid: ${topIntl.price}`);
    assert(topIntl.googleBookingUrl && topIntl.googleBookingUrl.includes('google.com/travel/flights'), 'Direct Google booking URL exists');
  } catch (err) {
    console.error('International test error:', err);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');
}

runTests();
