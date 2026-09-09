const token = 'duffel_test_kO0RwadYDWJV79oavGF_phWe0MMfJYt0BZi7UjssPn_';

async function test() {
  try {
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
    const data = await res.json();
    const offers = data.data?.offers;
    if (offers && offers.length > 0) {
      const firstOffer = offers[0];
      console.log('Testing Duffel Links session creation with offer ID:', firstOffer.id);
      const linkRes = await fetch('https://api.duffel.com/links/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Duffel-Version': 'v2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            offer_id: firstOffer.id,
            success_url: 'https://romy.app/booking-success',
            failure_url: 'https://romy.app/booking-failed',
            abandonment_url: 'https://romy.app/booking-abandoned',
            reference: `romy-${Date.now()}`,
          }
        })
      });
      console.log('Links session status:', linkRes.status);
      const linkData = await linkRes.json();
      console.log('Links session data:', JSON.stringify(linkData, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
