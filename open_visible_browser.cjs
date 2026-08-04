const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Ouverture de Chrome Dev en position visible au centre de votre écran...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe',
    headless: false,
    defaultViewport: null,
    slowMo: 80,
    args: [
      '--window-position=50,50',
      '--window-size=1360,800',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();
  console.log('📍 Navigation vers http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Clic connexion
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('Admin Général') || text.includes('Direction'))) {
      await btn.click();
      break;
    }
  }

  console.log('✅ Navigateur ouvert et connecté au centre de votre écran !');
})();
