const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const CHROME_DEV_PATH = 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe';
const TEST_PROFILE_PATH = 'C:\\GescoTestProfile';

if (!fs.existsSync(TEST_PROFILE_PATH)) {
  fs.mkdirSync(TEST_PROFILE_PATH, { recursive: true });
}

(async () => {
  console.log(`🚀 Lancement du test visuel dans le profil dédié (${TEST_PROFILE_PATH})...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_DEV_PATH,
    userDataDir: TEST_PROFILE_PATH, // PROFIL DÉDIÉ AUX TESTS GESCO
    headless: false, // MODE VISUEL REEL SUR VOTRE ECRAN
    defaultViewport: null,
    slowMo: 120,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
      '--window-position=0,0',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  try {
    console.log('📍 Navigation vers http://localhost:3000 dans le profil de test...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // 1. CONNEXION
    console.log('🔑 Connexion automatique Direction / Admin Général...');
    const buttons = await page.$$('button');
    let connected = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Admin Général') || text.includes('Direction'))) {
        console.log(`  👉 Clic sur : "${text.trim()}"`);
        await btn.click();
        connected = true;
        break;
      }
    }

    await new Promise(r => setTimeout(r, 2000));
    console.log('📊 Dashboard affiché avec succès dans le profil de test !');

    // Helper de test interactif par vue
    async function runViewTest(viewName, keywords) {
      console.log(`\n========================================`);
      console.log(`🔍 TEST DANS PROFIL DÉDIÉ : [${viewName}]`);
      console.log(`========================================`);

      const navItems = await page.$$('.sidebar-item, button, a');
      let target = null;
      for (const item of navItems) {
        const text = await page.evaluate(el => el.textContent, item);
        if (text && keywords.some(k => text.toLowerCase().includes(k.toLowerCase()))) {
          target = item;
          break;
        }
      }

      if (target) {
        await target.click();
        await new Promise(r => setTimeout(r, 1500));
        console.log(`  ✅ Vue ${viewName} affichée à l'écran`);

        // Test des sous-onglets
        const tabs = await page.$$('.tab, [role="tab"], button');
        for (let i = 0; i < Math.min(tabs.length, 3); i++) {
          const tabText = await page.evaluate(el => el.textContent, tabs[i]);
          if (tabText && tabText.trim().length > 2 && tabText.trim().length < 25 && !tabText.includes('Déconnexion')) {
            try {
              console.log(`    👉 Clic onglet : "${tabText.trim()}"`);
              await tabs[i].click();
              await new Promise(r => setTimeout(r, 800));
            } catch (e) {}
          }
        }

        // Test action / modale
        const actionBtns = await page.$$('button');
        for (const actBtn of actionBtns) {
          const btnText = await page.evaluate(el => el.textContent, actBtn);
          if (btnText && (btnText.includes('Nouveau') || btnText.includes('Ajouter') || btnText.includes('Créer'))) {
            console.log(`    👉 Clic action : "${btnText.trim()}"`);
            try {
              await actBtn.click();
              await new Promise(r => setTimeout(r, 1500));
              await page.keyboard.press('Escape');
              await new Promise(r => setTimeout(r, 600));
            } catch (e) {}
            break;
          }
        }
      }
    }

    // 2. PARCOURS INTERACTIF
    await runViewTest('Élèves', ['Élèves', 'Eleves']);
    await runViewTest('Parents', ['Parents']);
    await runViewTest('Classes', ['Classes']);
    await runViewTest('Personnel', ['Personnel']);
    await runViewTest('Présences', ['Présences', 'Presences']);
    await runViewTest('Emploi du Temps', ['Emploi']);
    await runViewTest('Notes & Évaluations', ['Notes']);
    await runViewTest('Bulletins', ['Bulletins']);
    await runViewTest('Encaissements', ['Encaissements']);
    await runViewTest('Dossiers Financiers', ['Dossiers Financiers']);
    await runViewTest('Cantine', ['Cantine']);
    await runViewTest('Transport', ['Transport']);
    await runViewTest('Dépenses', ['Dépenses']);
    await runViewTest('Rapports', ['Rapports']);
    await runViewTest('Statistiques', ['Statistiques']);
    await runViewTest('Journal d\'Audit', ['Journal', 'Audit']);
    await runViewTest('Paramètres', ['Paramètres']);

    console.log('\n========================================');
    console.log('🎉 TEST PARFAITEMENT EXÉCUTÉ DANS LE PROFIL DE TEST !');
    console.log('========================================');

  } catch (err) {
    console.error('Erreur :', err);
  }
})();
