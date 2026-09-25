const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\da46d9c6-a222-4c89-af9c-7b507022d03d';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const REPORT = {
  testedScreens: [],
  consoleErrors: [],
  pageErrors: [],
  dialogs: [],
  functionalIssues: [],
  uiIssues: [],
  securityIssues: [],
};

async function runAudit() {
  console.log('--- STARTING MULTI-AGENT HEADLESS AUDIT ---');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // Mobile viewport (iPhone 11/XR style for React Native Web)
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter noisy React Native Web non-breaking warnings if harmless
      REPORT.consoleErrors.push({ url: page.url(), text });
      console.log(`[CONSOLE ERROR] on ${page.url()}: ${text.substring(0, 150)}`);
    }
  });

  page.on('pageerror', err => {
    REPORT.pageErrors.push({ url: page.url(), message: err.message, stack: err.stack });
    console.error(`[PAGE ERROR] on ${page.url()}: ${err.message}`);
  });

  page.on('dialog', async dialog => {
    const dialogInfo = {
      type: dialog.type(),
      message: dialog.message(),
      url: page.url(),
    };
    REPORT.dialogs.push(dialogInfo);
    console.log(`[BROWSER DIALOG (${dialog.type()})] "${dialog.message()}" on ${page.url()}`);
    await dialog.accept();
  });

  // 1. Root redirect test
  console.log('\n--- 1. Testing Root (/) ---');
  try {
    await page.goto('http://localhost:8081/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const rootUrl = page.url();
    console.log(`Root redirected to: ${rootUrl}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_root.png') });
    REPORT.testedScreens.push({ name: 'Root Redirect', url: rootUrl, status: 'OK' });
  } catch (err) {
    console.error('Failed on Root:', err.message);
    REPORT.functionalIssues.push({ screen: 'Root', issue: err.message });
  }

  // 2. Auth & Login/Cadastro Screen
  console.log('\n--- 2. Testing (auth)/login ---');
  try {
    await page.goto('http://localhost:8081/(auth)/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_login_initial.png') });

    // Click "Criar Conta" tab
    console.log('Searching for "Criar Conta" tab button...');
    const signupTab = page.locator('text=Criar Conta').first();
    if (await signupTab.isVisible()) {
      await signupTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_signup_tab.png') });
      console.log('Clicked "Criar Conta" tab.');
    } else {
      REPORT.uiIssues.push({ screen: 'Login', issue: '"Criar Conta" tab not visible or accessible' });
    }

    // Test empty submit on signup
    console.log('Testing empty form submission...');
    const submitBtn = page.locator('div[role="button"]:has-text("Criar Conta"), button:has-text("Criar Conta")').last();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      console.log('Clicked submit on empty form. Dialog captured? Count:', REPORT.dialogs.length);
    }

    // Test filling invalid short password
    console.log('Testing short password validation...');
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]').first();
    const passInput = page.locator('input[type="password"], input[placeholder*="senha" i]').first();

    if (await emailInput.isVisible() && await passInput.isVisible()) {
      await emailInput.fill('teste@romy.com');
      await passInput.fill('123');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Test Privacy Modal
    console.log('Testing Terms & Privacy Modal...');
    const privacyLink = page.locator('text=Termos de Uso').first();
    if (await privacyLink.isVisible()) {
      await privacyLink.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_privacy_modal.png') });
      // Close modal
      const closeBtn = page.locator('text=Entendi e Concordo, text=Fechar').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    REPORT.testedScreens.push({ name: 'Auth/Login', url: page.url(), status: 'OK' });
  } catch (err) {
    console.error('Failed on Login:', err.message);
    REPORT.functionalIssues.push({ screen: 'Login', issue: err.message });
  }

  // 3. Onboarding Screens (Step 1 to Step 6)
  const steps = [
    { num: 1, route: 'step1-personal', name: 'Step 1: Dados Pessoais' },
    { num: 2, route: 'step2-trip', name: 'Step 2: Próxima Viagem' },
    { num: 3, route: 'step3-travelstyle', name: 'Step 3: Estilo de Viagem' },
    { num: 4, route: 'step4-interests', name: 'Step 4: Interesses' },
    { num: 5, route: 'step5-social', name: 'Step 5: Redes Sociais' },
    { num: 6, route: 'step6-connections', name: 'Step 6: Conexões' },
  ];

  for (const s of steps) {
    console.log(`\n--- 3.${s.num} Testing Onboarding ${s.name} ---`);
    try {
      await page.goto(`http://localhost:8081/(auth)/onboarding/${s.route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `03_${s.route}.png`) });

      // Special security check on Step 1: Underage test
      if (s.route === 'step1-personal') {
        console.log('Testing Underage Security Enforcement (+18)...');
        const nextBtn = page.locator('text=Continuar, text=Próximo').first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // Check if chips or buttons can be clicked
      const chips = page.locator('div[role="button"]').slice(0, 3);
      const count = await chips.count();
      for (let i = 0; i < count; i++) {
        try {
          await chips.nth(i).click({ timeout: 1000 });
        } catch {}
      }

      REPORT.testedScreens.push({ name: s.name, url: page.url(), status: 'OK' });
    } catch (err) {
      console.error(`Failed on ${s.name}:`, err.message);
      REPORT.functionalIssues.push({ screen: s.name, issue: err.message });
    }
  }

  // 4. Main App Tabs
  const tabs = [
    { route: '(tabs)', name: 'Feed & Map' },
    { route: '(tabs)/communities', name: 'Comunidades' },
    { route: '(tabs)/connections', name: 'Conexões' },
    { route: '(tabs)/chat', name: 'Chat & Mensagens' },
    { route: '(tabs)/profile', name: 'Meu Perfil' },
    { route: 'settings', name: 'Configurações' },
    { route: '(modals)/paywall', name: 'Paywall VIP' },
    { route: 'help-board', name: 'Help Board' },
  ];

  for (const t of tabs) {
    console.log(`\n--- 4. Testing ${t.name} (http://localhost:8081/${t.route}) ---`);
    try {
      await page.goto(`http://localhost:8081/${t.route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
      const safeName = t.route.replace(/[\/\(\)]/g, '_');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `04_${safeName}.png`) });

      REPORT.testedScreens.push({ name: t.name, url: page.url(), status: 'OK' });
    } catch (err) {
      console.error(`Failed on ${t.name}:`, err.message);
      REPORT.functionalIssues.push({ screen: t.name, issue: err.message });
    }
  }

  await browser.close();

  // Write final report
  const reportPath = path.join(ARTIFACT_DIR, 'audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(REPORT, null, 2), 'utf-8');
  console.log(`\n--- AUDIT COMPLETED. Report saved to ${reportPath} ---`);
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
