async function run() {
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
  
  const regex = /AF_initDataCallback\(\{key: 'ds:1', hash: '[^']+', data:(.+?)(, sideChannel: \{\}\}\);|\}\);<\/script>)/s;
  const match = regex.exec(text);
  if (!match) {
    console.log('No match for ds:1');
    return;
  }
  
  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    console.log('Error parsing JSON:', e.message);
    return;
  }
  
  console.log('Top array length:', data.length);
  // Recursively or systematically find where the flight lists are
  function searchArrays(arr, path = '') {
    if (!Array.isArray(arr)) return;
    
    // Check if this array contains flight cards
    // A flight card in Google flights has an airline code like "LA", "G3", "AD"
    if (arr.length > 0 && typeof arr[0] === 'string' && ['LA', 'G3', 'AD', 'TP', 'AA', 'DL', 'UA'].includes(arr[0])) {
      console.log(`Found airline code at path: ${path} -> [${arr[0]}, ${JSON.stringify(arr[1])}]`);
      return;
    }
    
    // Also check if elements in arr have that
    if (arr.length > 0 && Array.isArray(arr[0]) && arr[0].length > 0 && Array.isArray(arr[0][0]) && typeof arr[0][0][0] === 'string' && ['LA', 'G3', 'AD'].includes(arr[0][0][0])) {
      console.log(`Found list of flights at path: ${path}, count = ${arr.length}`);
      console.log('Sample item structure:', JSON.stringify(arr[0]).slice(0, 300));
      return;
    }
    
    arr.forEach((sub, i) => {
      searchArrays(sub, `${path}[${i}]`);
    });
  }
  
  searchArrays(data, 'root');
}

run();
