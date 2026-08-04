const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots_live_full_test');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  console.log('🔌 Connexion au navigateur Chrome Beta ouvert sur le bureau (port 9222)...');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    console.log('✅ Connecté avec succès au Chrome Beta de votre écran !');
  } catch (err) {
    console.log('⚠️ Impossible de se connecter sur le port 9222, lancement direct...');
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe',
      headless: false,
      defaultViewport: null,
      slowMo: 80,
      args: ['--start-maximized', '--window-position=0,0']
    });
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  try {
    console.log('📍 Navigation vers http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // 1. CONNEXION
    console.log('🔑 Connexion automatique en cours...');
    const buttons = await page.$$('button');
    let loggedIn = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Admin Général') || text.includes('Direction'))) {
        console.log(`  👉 Clic sur "${text.trim()}"`);
        await btn.click();
        loggedIn = true;
        break;
      }
    }

    if (!loggedIn) {
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
    await page.screenshot({ path: path.join(screenshotDir, '01_dashboard.png') });

    // Helper de navigation & interactions
    async function testModule(name, searchTerms) {
      console.log(`\n========================================`);
      console.log(`🎯 TEST EN LIVE DU MODULE : [${name}]`);
      console.log(`========================================`);

      const navBtns = await page.$$('.sidebar-item, button, a');
      let targetBtn = null;
      for (const btn of navBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && searchTerms.some(term => text.toLowerCase().includes(term.toLowerCase()))) {
          targetBtn = btn;
          break;
        }
      }

      if (targetBtn) {
        await targetBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        await page.screenshot({ path: path.join(screenshotDir, `module_${name}.png`) });

        // Clic sur les onglets internes s'il y en a
        const tabs = await page.$$('.tab, [role="tab"], button');
        for (let i = 0; i < Math.min(tabs.length, 4); i++) {
          const tabText = await page.evaluate(el => el.textContent, tabs[i]);
          if (tabText && tabText.trim().length > 2 && tabText.trim().length < 20 && !tabText.includes('Déconnexion')) {
            try {
              await tabs[i].click();
              await new Promise(r => setTimeout(r, 600));
            } catch (e) {}
          }
        }

        // Action principale (Bouton Ajouter / Nouveau)
        const primaryBtns = await page.$$('button');
        for (const pBtn of primaryBtns) {
          const pText = await page.evaluate(el => el.textContent, pBtn);
          if (pText && (pText.includes('Nouveau') || pText.includes('Ajouter') || pText.includes('Créer'))) {
            console.log(`  👉 Clic action : "${pText.trim()}"`);
            try {
              await pBtn.click();
              await new Promise(r => setTimeout(r, 1500));
              await page.screenshot({ path: path.join(screenshotDir, `modal_${name}.png`) });
              await page.keyboard.press('Escape');
              await new Promise(r => setTimeout(r, 600));
            } catch (e) {}
            break;
          }
        }
      }
    }

    // 2. PARCOURS DE TOUS LES MODULES
    await testModule('Eleves', ['Élèves', 'Eleves']);
    await testModule('Parents', ['Parents']);
    await testModule('Classes', ['Classes']);
    await testModule('Personnel', ['Personnel']);
    await testModule('Presences', ['Présences', 'Presences']);
    await testModule('Emploi_du_temps', ['Emploi']);
    await testModule('Notes', ['Notes']);
    await testModule('Bulletins', ['Bulletins']);
    await testModule('Encaissements', ['Encaissements']);
    await testModule('Finance_Dossiers', ['Dossiers Financiers']);
    await testModule('Cantine', ['Cantine']);
    await testModule('Transport', ['Transport']);
    await testModule('Depenses', ['Dépenses']);
    await testModule('Rapports', ['Rapports']);
    await testModule('Statistiques', ['Statistiques']);
    await testModule('Journal_Audit', ['Journal', 'Audit']);
    await testModule('Parametres', ['Paramètres']);

    console.log('\n========================================');
    console.log('✨ PARCOURS EN LIVE TERMINÉ AVEC SUCCÈS !');
    console.log('========================================');

  } catch (err) {
    console.error('Erreur lors du test :', err);
  }
})();
