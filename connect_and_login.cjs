const puppeteer = require('puppeteer');

const CHROME_DEV_PATH = 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe';

(async () => {
  console.log('🔌 Connexion à Chrome Dev...');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    console.log('✅ Connecté avec succès sur le port 9222 (Chrome Dev) !');
  } catch (e) {
    console.log('⚠️ Connexion directe au binaire Chrome Dev...');
    browser = await puppeteer.launch({
      executablePath: CHROME_DEV_PATH,
      headless: false,
      defaultViewport: null,
      slowMo: 60,
      args: ['--start-maximized', '--window-position=0,0']
    });
  }

  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('localhost')) || pages[0];

  if (!page) {
    page = await browser.newPage();
  }

  console.log('📍 Accès à http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('🔑 Connexion automatique (Direction / Admin Général)...');
  const buttons = await page.$$('button');
  let clicked = false;
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('Admin Général') || text.includes('Direction'))) {
      console.log(`  👉 Clic sur: "${text.trim()}"`);
      await btn.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    const userInput = await page.$('input[placeholder*="utilisateur" i], input[type="text"]');
    const passInput = await page.$('input[type="password"]');
    if (userInput && passInput) {
      await userInput.type('admin');
      await passInput.type('admin123');
      const submit = await page.$('button[type="submit"], #btn-login');
      if (submit) await submit.click();
    }
  }

  await new Promise(r => setTimeout(r, 2000));
  console.log('🎉 Connecté sur le Tableau de bord dans Chrome Dev !');
})();
