const token = 'duffel_test_kO0RwadYDWJV79oavGF_phWe0MMfJYt0BZi7UjssPn_';

async function test() {
  try {
    console.log('Testing Duffel token...');
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
              origin: 'GRU',
              destination: 'MIA',
              departure_date: '2026-10-15',
            }
          ],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
        }
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response summary:', JSON.stringify(data).slice(0, 500));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
