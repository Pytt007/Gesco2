import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './screenshots_e2e';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testAllTabs() {
  console.log('🚀 Démarrage du test autonome E2E sur http://localhost:3000/...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const consoleErrors = [];
  const uncaughtErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`❌ [CONSOLE ERROR] ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.log(`💥 [PAGE UNCAUGHT ERROR] ${err.message}`);
    uncaughtErrors.push(err.message);
  });

  try {
    console.log('📍 Navigation vers http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    // Si on est sur la page de login, se connecter avec le bouton Direction (Admin)
    const isLogin = await page.$('input[placeholder*="utilisateur" i], input[type="password"]');
    if (isLogin) {
      console.log('🔑 Page de connexion détectée. Connexion automatique en tant que Direction (Admin)...');
      
      // Cliquer sur le bouton "👔 Direction"
      const quickBtns = await page.$$('button');
      let adminBtnClicked = false;
      for (const btn of quickBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Direction')) {
          await btn.click();
          adminBtnClicked = true;
          console.log('✅ Bouton 👔 Direction cliqué.');
          break;
        }
      }

      if (!adminBtnClicked) {
        // Fallback: remplir les champs manuellement
        await page.type('input[placeholder*="utilisateur" i]', 'admin');
        await page.type('input[type="password"]', 'admin123');
        const submitBtn = await page.$('#btn-login');
        if (submitBtn) await submitBtn.click();
      }

      await new Promise(r => setTimeout(r, 3500));
    }

    // Attendre que la sidebar soit présente
    await page.waitForSelector('.sidebar', { timeout: 10000 });
    console.log('✅ Sidebar chargée avec succès !');

    const tabsToTest = [
      'Tableau de bord',
      'Élèves',
      'Parents',
      'Classes',
      'Personnel',
      'Présences',
      'Emploi du Temps',
      'Notes & Éval.',
      'Bulletins',
      'Scolarité',
      'Cantine',
      'Transport',
      'Dépenses',
      'Rapports',
      'Paramètres'
    ];

    const results = [];

    for (const tabName of tabsToTest) {
      console.log(`\n🔍 Navigation vers l'onglet : [${tabName}]...`);
      try {
        const sidebarItems = await page.$$('.sidebar-item');
        let clicked = false;
        for (const item of sidebarItems) {
          const text = await page.evaluate(el => el.textContent, item);
          if (text && text.toLowerCase().includes(tabName.toLowerCase())) {
            await item.click();
            await new Promise(r => setTimeout(r, 1800));
            clicked = true;
            break;
          }
        }

        if (!clicked) {
          console.log(`⚠️ Bouton "${tabName}" non trouvé directement dans les éléments visibles de la sidebar.`);
        }

        // Vérifier si un message d'erreur ErrorBoundary s'affiche dans le DOM
        const errorText = await page.evaluate(() => {
          const body = document.body.innerText;
          if (body.includes('Une erreur est survenue') || body.includes('is not defined') || body.includes('TypeError')) {
            return body;
          }
          return null;
        });

        const screenshotPath = path.join(SCREENSHOT_DIR, `tab_${tabName.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
        await page.screenshot({ path: screenshotPath });

        if (errorText) {
          console.log(`❌ ERREUR DÉTECTÉE SUR [${tabName}] : ${errorText.slice(0, 150)}...`);
          results.push({ name: tabName, status: 'FAILED', error: errorText.slice(0, 200) });
        } else {
          console.log(`✅ Onglet [${tabName}] OK ! (Capture enregistrée dans ${screenshotPath})`);
          results.push({ name: tabName, status: 'PASSED' });
        }
      } catch (err) {
        console.log(`❌ Exception lors du test de ${tabName}: ${err.message}`);
        results.push({ name: tabName, status: 'FAILED', error: err.message });
      }
    }

    console.log('\n========================================');
    console.log('📊 RÉSULTAT DU TEST GLOBAL E2E DÉPLOIEMENT :');
    console.log('========================================');
    console.table(results);

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'results.json'),
      JSON.stringify({ results, consoleErrors, uncaughtErrors }, null, 2)
    );

  } catch (err) {
    console.error('💥 Erreur globale lors du test E2E :', err);
  } finally {
    await browser.close();
  }
}

testAllTabs();
