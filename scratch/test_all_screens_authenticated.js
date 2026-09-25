const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:\\Users\\PC\\Desktop\\Romy 0.1\\.env' });

const ARTIFACT_DIR = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\da46d9c6-a222-4c89-af9c-7b507022d03d';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots');

const REPORT = {
  testedScreens: [],
  consoleErrors: [],
  pageErrors: [],
  dialogs: [],
  uiFindings: [],
  securityFindings: [],
  functionalFindings: [],
};

async function runFullAudit() {
  console.log('=== STARTING COMPLETE MULTI-AGENT HEADLESS AUDIT ===');

  // 1. Get real Supabase session
  const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { session }, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'audit_tester@romy.com',
    password: 'Password123!'
  });

  if (loginErr || !session) {
    console.error('Failed to get session from Supabase:', loginErr);
    return;
  }
  console.log('Got valid Supabase session for:', session.user.email);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      REPORT.consoleErrors.push({ url: page.url(), text });
      console.log(`[CONSOLE ERROR] on ${page.url()}: ${text.substring(0, 150)}`);
    }
  });

  page.on('pageerror', err => {
    REPORT.pageErrors.push({ url: page.url(), message: err.message });
    console.error(`[PAGE ERROR] on ${page.url()}: ${err.message}`);
  });

  page.on('dialog', async dialog => {
    const dialogInfo = {
      type: dialog.type(),
      message: dialog.message(),
      url: page.url(),
    };
    REPORT.dialogs.push(dialogInfo);
    console.log(`[ALERT/DIALOG INTERCEPTED (${dialog.type()})] "${dialog.message()}" on ${page.url()}`);
    await dialog.accept();
  });

  // --- PART 1: TEST LOGIN SCREEN UN-AUTHENTICATED ---
  console.log('\n--- 1. Testing Login & Cadastro Screen (Unauthenticated) ---');
  await page.goto('http://localhost:8081/(auth)/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Test empty submit
  const loginBtn = page.locator('text=Entrar').last();
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
    await page.waitForTimeout(500);
  }

  // Switch to "Criar Conta" tab
  const signupTab = page.locator('text=Criar Conta').first();
  if (await signupTab.isVisible()) {
    await signupTab.click();
    await page.waitForTimeout(500);
  }

  // Test short password on signup
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]').first();
  const passInput = page.locator('input[type="password"], input[placeholder*="senha" i]').first();
  if (await emailInput.isVisible() && await passInput.isVisible()) {
    await emailInput.fill('teste@exemplo.com');
    await passInput.fill('123');
    const signupBtn = page.locator('text=Criar conta e montar perfil').first();
    if (await signupBtn.isVisible()) {
      await signupBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Test Privacy modal
  const termsLink = page.locator('text=Termos de Uso').first();
  if (await termsLink.isVisible()) {
    await termsLink.click();
    await page.waitForTimeout(500);
    const closeTerms = page.locator('text=Entendi e Concordo').first();
    if (await closeTerms.isVisible()) {
      await closeTerms.click();
      await page.waitForTimeout(400);
    }
  }

  // --- PART 2: INJECT SESSION & TEST ALL AUTHENTICATED TABS & SCREENS ---
  console.log('\n--- 2. Injecting Session into LocalStorage for Authenticated App Testing ---');
  const storageKey = `sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  await page.evaluate(({ key, sess }) => {
    window.localStorage.setItem(key, JSON.stringify(sess));
  }, { key: storageKey, sess: session });

  const authenticatedScreens = [
    { url: 'http://localhost:8081/(tabs)', name: 'Feed e Mapa', shot: '07_feed.png' },
    { url: 'http://localhost:8081/(tabs)/communities', name: 'Comunidades', shot: '08_communities.png' },
    { url: 'http://localhost:8081/(tabs)/connections', name: 'Conexões', shot: '09_connections.png' },
    { url: 'http://localhost:8081/(tabs)/chat', name: 'Mensagens', shot: '10_chat.png' },
    { url: 'http://localhost:8081/(tabs)/profile', name: 'Meu Perfil', shot: '11_profile.png' },
    { url: 'http://localhost:8081/edit-profile', name: 'Editar Perfil', shot: '12_edit_profile.png' },
    { url: 'http://localhost:8081/settings', name: 'Configurações', shot: '13_settings.png' },
    { url: 'http://localhost:8081/privacy-security', name: 'Privacidade & Segurança', shot: '14_privacy_security.png' },
    { url: 'http://localhost:8081/notification-settings', name: 'Configurações de Notificação', shot: '15_notification_settings.png' },
    { url: 'http://localhost:8081/help-board', name: 'Help Board', shot: '16_help_board.png' },
    { url: 'http://localhost:8081/(modals)/paywall', name: 'Paywall VIP', shot: '17_paywall.png' },
  ];

  for (const s of authenticatedScreens) {
    console.log(`\nNavigating to ${s.name} (${s.url})...`);
    try {
      await page.goto(s.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, s.shot) });
      REPORT.testedScreens.push({ name: s.name, url: page.url(), status: 'OK' });
      console.log(`Rendered ${s.name} at: ${page.url()}`);

      // Interactive actions per screen
      if (s.name === 'Feed e Mapa') {
        const mapToggle = page.locator('text=Mapa').first();
        if (await mapToggle.isVisible()) {
          console.log('Toggling to Mapa view...');
          await mapToggle.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_feed_map_view.png') });
        }
      }

      if (s.name === 'Comunidades') {
        const createComm = page.locator('text=Criar Comunidade, text=Criar').first();
        if (await createComm.isVisible()) {
          console.log('Opening Create Community modal...');
          await createComm.click();
          await page.waitForTimeout(800);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_create_community_modal.png') });
          const closeComm = page.locator('text=Cancelar, text=Fechar').first();
          if (await closeComm.isVisible()) await closeComm.click();
        }
      }

      if (s.name === 'Configurações') {
        const darkBtn = page.locator('text=Escuro').first();
        if (await darkBtn.isVisible()) {
          console.log('Testing Dark theme toggle...');
          await darkBtn.click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_settings_dark.png') });
        }
      }
    } catch (err) {
      console.error(`Error on ${s.name}:`, err.message);
      REPORT.functionalFindings.push({ screen: s.name, error: err.message });
    }
  }

  // --- PART 3: TEST UNDERAGE PROTECTION (+18) ON STEP 1 ---
  console.log('\n--- 3. Testing Step 1 Underage Protection (+18) ---');
  await page.goto('http://localhost:8081/(auth)/onboarding/step1-personal', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  const nameInput = page.locator('input[placeholder*="nome" i]').first();
  if (await nameInput.isVisible()) await nameInput.fill('Jovem Menor');

  // Fill gender
  const femChip = page.locator('text=Feminino').first();
  if (await femChip.isVisible()) await femChip.click();

  // Fill city
  const cityInput = page.locator('input[placeholder*="Florianópolis" i]').first();
  if (await cityInput.isVisible()) await cityInput.fill('São Paulo, Brasil');

  // Fill underage birth date (year 2015 = 11 years old)
  const dayInput = page.locator('input[placeholder*="15" i]').first();
  const yearInput = page.locator('input[placeholder*="1998" i]').first();
  if (await dayInput.isVisible() && await yearInput.isVisible()) {
    await dayInput.fill('10');
    await yearInput.fill('2015');
  }

  // Click Continuar to verify +18 blocker
  const continueBtn = page.locator('text=Continuar').first();
  if (await continueBtn.isVisible()) {
    console.log('Clicking Continuar to trigger underage validation...');
    await continueBtn.click();
    await page.waitForTimeout(600);
    console.log('Dialogs triggered:', REPORT.dialogs.length);
  }

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'full_audit_report.json'), JSON.stringify(REPORT, null, 2), 'utf-8');
  console.log('\n=== FULL AUDIT COMPLETED. Report saved! ===');
}

runFullAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
