const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const CHROME_BETA_PATH = 'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe';

const screenshotDir = path.join(__dirname, 'screenshots_live_full_test');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Ouvrir directement Chrome Beta via le système Windows sur le bureau
exec(`"${CHROME_BETA_PATH}" http://localhost:3000`, (err) => {
  if (err) {
    exec('start chrome http://localhost:3000');
  }
});

(async () => {
  console.log(`🚀 Lancement de Chrome Beta (${CHROME_BETA_PATH})...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_BETA_PATH, // Chrome Beta explicite
      headless: false,
      defaultViewport: null,
      slowMo: 50,
      args: [
        '--start-maximized',
        '--window-position=0,0',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
  } catch (e) {
    console.log('Erreur de lancement direct Chrome Beta, fallback Puppeteer...', e.message);
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      slowMo: 50,
      args: ['--start-maximized', '--window-position=0,0', '--no-sandbox']
    });
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  try {
    console.log('📍 Navigation vers http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Connexion automatique Admin
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Admin Général') || text.includes('Direction'))) {
        await btn.click();
        break;
      }
    }

    await new Promise(r => setTimeout(r, 2000));

    // Défiler les vues principales
    const viewsToTest = [
      { name: 'Élèves', key: 'Élèves' },
      { name: 'Parents', key: 'Parents' },
      { name: 'Classes', key: 'Classes' },
      { name: 'Personnel', key: 'Personnel' },
      { name: 'Présences', key: 'Présences' },
      { name: 'Emploi du Temps', key: 'Emploi' },
      { name: 'Notes', key: 'Notes' },
      { name: 'Bulletins', key: 'Bulletins' },
      { name: 'Encaissements', key: 'Encaissements' },
      { name: 'Cantine', key: 'Cantine' },
      { name: 'Transport', key: 'Transport' },
      { name: 'Statistiques', key: 'Statistiques' },
      { name: 'Paramètres', key: 'Paramètres' }
    ];

    for (const view of viewsToTest) {
      console.log(`👉 Visite de : ${view.name}`);
      const navButtons = await page.$$('.sidebar-item, button');
      for (const btn of navButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes(view.key)) {
          await btn.click();
          await new Promise(r => setTimeout(r, 1200));
          break;
        }
      }
    }

    console.log('✅ Fin du parcours dans Chrome Beta. Navigateur maintenu ouvert !');

  } catch (err) {
    console.error('Erreur :', err);
  }
})();
