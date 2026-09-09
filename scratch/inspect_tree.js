const fs = require('fs');

const raw = fs.readFileSync('scratch/cb_ds_1.json', 'utf-8');
const data = JSON.parse(raw);

console.log('Top array length:', data.length);
data.forEach((item, i) => {
  console.log(`Index ${i}: type=${typeof item}, isArray=${Array.isArray(item)}, len=${item?.length}`);
  if (Array.isArray(item)) {
    console.log(`  Sub[0]: isArray=${Array.isArray(item[0])}, len=${item[0]?.length}`);
    if (Array.isArray(item[0])) {
      console.log(`  Sub[0][0]:`, item[0][0]);
    }
  }
});
