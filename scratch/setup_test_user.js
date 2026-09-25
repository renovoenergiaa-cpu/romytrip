const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:\\Users\\PC\\Desktop\\Romy 0.1\\.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function setupTestUser() {
  const email = 'audit_tester@romy.com';
  const password = 'Password123!';

  console.log(`Setting up test user: ${email}`);
  
  // Try sign in
  let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.log('User not found or sign in failed, attempting signUp...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      console.error('Sign up error:', signUpError);
      return;
    }
    authData = signUpData;
  }

  const user = authData.user;
  console.log(`User authenticated: ${user.id}`);

  // Upsert user profile in public.users
  const { error: profileError } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    name: 'Auditor Antigravity',
    dob: '1995-05-15',
    city: 'São Paulo, Brasil',
    sex: 'Não-binário',
    bio: 'Perfil automatizado para auditoria de UI/UX, acessibilidade e segurança do Romy.',
    destination: 'Lisboa, Portugal',
    trip_start_date: '2026-11-01',
    trip_end_date: '2026-11-15',
    travel_styles: ['Cultural', 'Urbano'],
    interests: ['Museus & História', 'Cafés Charmosos', 'Fotografia'],
    photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'],
    budget: '$$',
    is_profile_complete: true,
  });

  if (profileError) {
    console.warn('Profile upsert warning:', profileError);
  } else {
    console.log('Profile successfully populated and marked complete!');
  }

  console.log('\nSESSION TOKEN FOR LOCALSTORAGE INJECTION:');
  console.log(JSON.stringify(authData.session));
}

setupTestUser();
