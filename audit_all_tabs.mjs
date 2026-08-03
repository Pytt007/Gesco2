import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './screenshots_e2e';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function auditApp() {
  console.log('🚀 Démarrage du contrôle d\'audit complet de l\'application GESCO sur http://localhost:3000 ...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  const uncaughtErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    uncaughtErrors.push(err.message);
  });

  const modules = [
    { name: 'Tableau de bord', id: 'dashboard' },
    { name: 'Élèves', id: 'students' },
    { name: 'Parents', id: 'parents' },
    { name: 'Classes', id: 'classes' },
    { name: 'Personnel', id: 'staff' },
    { name: 'Présences', id: 'attendance' },
    { name: 'Emploi du Temps', id: 'timetable' },
    { name: 'Notes & Éval.', id: 'grades' },
    { name: 'Bulletins', id: 'bulletins' },
    { name: 'Scolarité', id: 'scolarity' },
    { name: 'Cantine', id: 'canteen' },
    { name: 'Transport', id: 'transport' },
    { name: 'Dépenses', id: 'expenses' },
    { name: 'Rapports', id: 'reports' },
    { name: 'Paramètres', id: 'settings' }
  ];

  const auditResults = [];

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Connexion si écran de login présent
    const isLogin = await page.$('input[type="password"]');
    if (isLogin) {
      console.log('🔑 Connexion automatique...');
      const quickBtns = await page.$$('button');
      for (const btn of quickBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('Direction') || text.includes('Admin Général'))) {
          await btn.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    for (const mod of modules) {
      console.log(`\n🔍 Audit du module : [${mod.name}]...`);
      let status = 'PASSED';
      let issues = [];

      try {
        const sidebarItems = await page.$$('.sidebar-item, button');
        let clicked = false;
        for (const item of sidebarItems) {
          const text = await page.evaluate(el => el.textContent, item);
          if (text && text.toLowerCase().includes(mod.name.toLowerCase())) {
            await item.click();
            await new Promise(r => setTimeout(r, 2000));
            clicked = true;
            break;
          }
        }

        if (!clicked) {
          status = 'WARNING';
          issues.push(`Élément de navigation pour "${mod.name}" non trouvé directement dans le menu principal.`);
        }

        // Vérification des erreurs de rendu React
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.includes('Une erreur est survenue') || pageText.includes('TypeError') || pageText.includes('Uncaught Error')) {
          status = 'FAILED';
          issues.push('Erreur de rendu (ErrorBoundary déclenché sur cette page).');
        }

        // Capture d'écran
        const screenshotName = `tab_${mod.id}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        // Analyse visuelle / métriques basiques
        const metricsCount = await page.evaluate(() => {
          const cards = document.querySelectorAll('.card, [class*="card"]');
          return cards.length;
        });

        auditResults.push({
          module: mod.name,
          id: mod.id,
          status,
          metricsCount,
          issues,
          screenshot: screenshotPath
        });

      } catch (modErr) {
        auditResults.push({
          module: mod.name,
          id: mod.id,
          status: 'FAILED',
          issues: [modErr.message],
          screenshot: null
        });
      }
    }

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'audit_summary.json'),
      JSON.stringify({ auditResults, consoleErrors, uncaughtErrors }, null, 2)
    );

    console.log('\n✅ Audit terminé ! Résultats enregistrés dans audit_summary.json');

  } catch (err) {
    console.error('Erreur globale d\'audit :', err);
  } finally {
    await browser.close();
  }
}

auditApp();
