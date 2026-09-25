const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:\\Users\\PC\\Desktop\\Romy 0.1\\.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing Supabase login...');
  const emails = [
    'sofia.lorenzo.test@romy.com',
    'rafael.test1@romy.com',
    'thiago.mendes.test@romy.com',
  ];
  
  for (const email of emails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'password123!'
    });
    if (error) {
      console.log(`Login failed for ${email}:`, error.message);
    } else {
      console.log(`LOGIN SUCCESS! User ID: ${data.user.id}, Email: ${data.user.email}`);
      return data;
    }
  }
}

test();
