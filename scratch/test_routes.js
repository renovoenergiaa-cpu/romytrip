const token = process.env.EXPO_PUBLIC_DUFFEL_ACCESS_TOKEN || '';

async function testRoute(origin, dest) {
  try {
    console.log(`\nTesting Duffel: ${origin} -> ${dest}`);
    const res = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices: [
            {
              origin,
              destination: dest,
              departure_date: '2026-10-20',
            }
          ],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
        }
      })
    });
    const data = await res.json();
    console.log(`Status: ${res.status}, Offers: ${data.data?.offers?.length || 0}`);
    if (data.errors) {
      console.log('Errors:', JSON.stringify(data.errors));
    } else if (data.data?.offers?.length > 0) {
      const top = data.data.offers.slice(0, 3);
      top.forEach((o, idx) => {
        console.log(` Offer ${idx + 1}: ${o.owner?.name} (${o.slices[0]?.segments[0]?.operating_carrier?.name}) - ${o.total_currency} ${o.total_amount}`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await testRoute('GRU', 'GIG'); // São Paulo -> Rio
  await testRoute('GRU', 'BSB'); // São Paulo -> Brasília
  await testRoute('GRU', 'LIS'); // São Paulo -> Lisboa
  await testRoute('GRU', 'CDG'); // São Paulo -> Paris
  await testRoute('GRU', 'JFK'); // São Paulo -> Nova York
  await testRoute('GRU', 'MCO'); // São Paulo -> Orlando
}

run();
