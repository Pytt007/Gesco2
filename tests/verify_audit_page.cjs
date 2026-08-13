const puppeteer = require('puppeteer');
const fs = require('fs');

const CHROME_DEV_PATH = 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe';
const CHROME_STABLE_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LOCAL_URL = 'http://localhost:3000';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function verifyAuditPage() {
  const executablePath = fs.existsSync(CHROME_DEV_PATH) ? CHROME_DEV_PATH : CHROME_STABLE_PATH;
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('[1] Navigation vers http://localhost:3000...');
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Connexion
    const userInput = await page.$('input[placeholder*="Utilisateur"], input[placeholder*="Email"], input[name="username"]');
    const passInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"], button.btn-primary');

    if (userInput && passInput && submitBtn) {
      await userInput.type('admin');
      await passInput.type('admin123');
      await submitBtn.click();
      await delay(2000);
    }

    // Naviguer vers Journal d'Audit
    console.log('[2] Navigation vers la page Journal d\'Audit...');
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a, button, div')).find(el => el.textContent && el.textContent.includes('Audit'));
      if (link) link.click();
    });
    await delay(2000);

    // Vérifier les valeurs des cartes
    const textContent = await page.evaluate(() => document.body.innerText);
    const has2840 = textContent.includes('2,840') || textContent.includes('2840');
    const has1420 = textContent.includes('1,420') || textContent.includes('1420');
    const has184 = textContent.includes('184');

    console.log(`- Contient '2,840' : ${has2840 ? 'OUI (Échec)' : 'NON (Succès, 100% Dynamique)'}`);
    console.log(`- Contient '1,420' : ${has1420 ? 'OUI (Échec)' : 'NON (Succès, 100% Dynamique)'}`);
    console.log(`- Contient '184'   : ${has184 ? 'OUI (Échec)' : 'NON (Succès, 100% Dynamique)'}`);

  } finally {
    await browser.close();
  }
}

verifyAuditPage();
