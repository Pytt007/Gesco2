const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots_e2e');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  console.log('🚀 Ouverture du navigateur en mode visuel (headful)...');
  
  const browser = await puppeteer.launch({
    headless: false, // Ouvre la fenêtre du navigateur réelle sur le bureau
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('📍 Navigation vers http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('🔑 Connexion automatique...');
    const quickBtns = await page.$$('button');
    let adminBtnClicked = false;
    for (const btn of quickBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Direction') || text.includes('Admin Général'))) {
        await btn.click();
        adminBtnClicked = true;
        console.log('✅ Bouton de connexion automatique cliqué !');
        break;
      }
    }

    if (!adminBtnClicked) {
      const userInput = await page.$('input[placeholder*="utilisateur" i]');
      if (userInput) {
        await page.type('input[placeholder*="utilisateur" i]', 'admin');
        await page.type('input[type="password"]', 'admin123');
        const submitBtn = await page.$('#btn-login, button[type="submit"]');
        if (submitBtn) await submitBtn.click();
      }
    }

    await new Promise(r => setTimeout(r, 3000));
    console.log('🎉 Le navigateur est ouvert et prêt pour vos tests sur http://localhost:3000 !');
    console.log('La fenêtre reste ouverte pour votre utilisation.');

  } catch (err) {
    console.error('Erreur lors du lancement :', err);
  }
})();
