const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/PC/Desktop/Romy 0.1/.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function runOnboardingE2E() {
  console.log('=== STARTING ONBOARDING END-TO-END AUTOMATED TEST ===');
  
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15'
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[PAGE ERROR]', msg.text());
  });

  // Authenticate test user
  const email = 'audit_tester@romy.com';
  const password = 'Password123!';
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error('Auth error:', authErr);
    await browser.close();
    return;
  }

  await page.goto('http://localhost:8081');
  await page.evaluate((session) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: session,
      expiresAt: session.expires_at,
    }));
    // Supabase JS v2 default storage key
    const ref = 'ybolfnlilxygcoaupygp';
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
  }, auth.session);

  // Navigate to Step 1
  console.log('Navigating to Step 1...');
  await page.goto('http://localhost:8081/(auth)/onboarding/step1-personal');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/PC/.gemini/antigravity-ide/brain/da46d9c6-a222-4c89-af9c-7b507022d03d/screenshots/e2e_step1.png' });

  // Navigate directly to Step 6 with store data pre-populated
  console.log('Navigating to Step 6...');
  await page.goto('http://localhost:8081/(auth)/onboarding/step6-connections');
  await page.waitForTimeout(2000);

  // Select an intention if needed
  const intentionBtn = await page.locator('text=Parceria de Passeio').first();
  if (await intentionBtn.isVisible()) {
    await intentionBtn.click();
    console.log('Selected connection intention.');
  }

  // Select gender preference
  const genderBtn = await page.locator('text=Todos os viajantes').first();
  if (await genderBtn.isVisible()) {
    await genderBtn.click();
    console.log('Selected gender preference.');
  }

  await page.screenshot({ path: 'C:/Users/PC/.gemini/antigravity-ide/brain/da46d9c6-a222-4c89-af9c-7b507022d03d/screenshots/e2e_step6_before_finish.png' });

  // Click Finish
  console.log('Clicking Finalizar Perfil e Conectar ✨...');
  const finishBtn = await page.locator('text=Finalizar Perfil e Conectar ✨').first();
  if (await finishBtn.isVisible()) {
    await finishBtn.click();
    console.log('Finish button clicked. Waiting for navigation or response...');
    await page.waitForTimeout(4000);
  }

  await page.screenshot({ path: 'C:/Users/PC/.gemini/antigravity-ide/brain/da46d9c6-a222-4c89-af9c-7b507022d03d/screenshots/e2e_after_finish.png' });
  console.log('Current URL after finish:', page.url());

  await browser.close();
  console.log('=== ONBOARDING E2E TEST COMPLETED ===');
}

runOnboardingE2E().catch(console.error);
