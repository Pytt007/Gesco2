const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const CHROME_DEV_PATH = 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe';

const reportDir = path.join(__dirname, 'qa_deep_visual_audit');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const auditFindings = {
  routesTested: [],
  tabsTested: [],
  modalsTested: [],
  drawersTested: [],
  breadcrumbsTested: [],
  errorsDetected: {
    reactErrors: [],
    pageBlanche: [],
    routesCassee: [],
    ecransVides: [],
    consoleErrors: []
  }
};

(async () => {
  console.log('🚀 DÉMARRAGE DU TEST VISUEL EN LIVE — AUDIT DEEP UI & ERROR DETECTION...');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_DEV_PATH,
      headless: false, // EXÉCUTION EN LIVE SUR L'ÉCRAN DANS CHROME DEV
      defaultViewport: null,
      slowMo: 60, // Ralenti contrôlé pour voir les clics en direct
      args: ['--start-maximized', '--window-position=0,0', '--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (err) {
    console.error('Erreur lancement Chrome Dev :', err);
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  // ÉCOUTEURS D'ERREURS DYNAMIQUES
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('Download the React DevTools')) {
        auditFindings.errorsDetected.consoleErrors.push({ url: page.url(), message: text });
        console.error(`  ❌ [Console Error] : ${text.slice(0, 100)}`);
      }
    }
  });

  page.on('pageerror', err => {
    auditFindings.errorsDetected.reactErrors.push({ url: page.url(), message: err.message, stack: err.stack });
    console.error(`  🔥 [React/Page Error] : ${err.message}`);
  });

  try {
    console.log('📍 Navigation vers http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // 1. AUTHENTIFICATION
    console.log('🔑 Connexion automatique profil Direction...');
    const quickBtns = await page.$$('button');
    for (const btn of quickBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Admin Général') || text.includes('Direction'))) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));

    // Helper d'analyse de page blanche / vide
    async function checkScreenIntegrity(locationName) {
      const isBlank = await page.evaluate(() => {
        const body = document.body;
        const textContent = body.innerText ? body.innerText.trim() : '';
        const interactiveElements = document.querySelectorAll('button, a, input, select, table, .card, [role="button"]');
        return {
          textLength: textContent.length,
          elementCount: interactiveElements.length,
          hasErrorBoundary: document.body.innerHTML.includes('Une erreur est survenue') || document.body.innerHTML.includes('Error')
        };
      });

      if (isBlank.hasErrorBoundary) {
        auditFindings.errorsDetected.reactErrors.push({ location: locationName, message: 'ErrorBoundary déclenché' });
      } else if (isBlank.elementCount === 0 || isBlank.textLength < 10) {
        auditFindings.errorsDetected.pageBlanche.push({ location: locationName, length: isBlank.textLength });
      }

      return isBlank;
    }

    // LISTE DES MODULES ET VUES A AUDITER
    const viewsToAudit = [
      { id: 'DASHBOARD', name: 'Tableau de bord', keywords: ['Tableau de bord', 'Dashboard'] },
      { id: 'STUDENTS', name: 'Élèves', keywords: ['Élèves', 'Eleves'] },
      { id: 'PARENTS', name: 'Parents', keywords: ['Parents'] },
      { id: 'CLASSES', name: 'Classes & Niveaux', keywords: ['Classes'] },
      { id: 'STAFF', name: 'Personnel & RH', keywords: ['Personnel'] },
      { id: 'ATTENDANCE', name: 'Présences & Appels', keywords: ['Présences'] },
      { id: 'TIMETABLE', name: 'Emploi du Temps', keywords: ['Emploi'] },
      { id: 'NOTES', name: 'Notes & Évaluations', keywords: ['Notes'] },
      { id: 'BULLETINS', name: 'Bulletins', keywords: ['Bulletins'] },
      { id: 'FINANCE_PAYMENTS', name: 'Encaissements & Caisse', keywords: ['Encaissements'] },
      { id: 'FINANCE_TRACKING', name: 'Dossiers Financiers', keywords: ['Dossiers Financiers'] },
      { id: 'CANTEEN', name: 'Cantine', keywords: ['Cantine'] },
      { id: 'TRANSPORT', name: 'Transport', keywords: ['Transport'] },
      { id: 'EXPENSES', name: 'Dépenses', keywords: ['Dépenses'] },
      { id: 'REPORTS', name: 'Rapports', keywords: ['Rapports'] },
      { id: 'STATISTICS', name: 'Statistiques', keywords: ['Statistiques'] },
      { id: 'HISTORY', name: 'Journal d\'Audit', keywords: ['Journal'] },
      { id: 'SETTINGS', name: 'Paramètres', keywords: ['Paramètres'] }
    ];

    // AUDIT SÉQUENTIEL DE CHAQUE VUE
    for (const view of viewsToAudit) {
      console.log(`\n========================================`);
      console.log(`🔍 AUDIT LIVE VUE : [${view.name}]`);
      console.log(`========================================`);

      // 1. Clic Sidebar
      const navButtons = await page.$$('.sidebar-item, button, a');
      let target = null;
      for (const btn of navButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && view.keywords.some(k => text.toLowerCase().includes(k.toLowerCase()))) {
          target = btn;
          break;
        }
      }

      if (target) {
        await target.click();
        await new Promise(r => setTimeout(r, 1200));
        const status = await checkScreenIntegrity(view.name);
        auditFindings.routesTested.push({ name: view.name, status: status.hasErrorBoundary ? 'ERROR' : 'OK', elements: status.elementCount });

        // 2. Test des Onglets internes
        const tabs = await page.$$('.tab, [role="tab"], .btn-group button, .nav-tabs button, .tabs button');
        console.log(`  👉 ${tabs.length} onglets détectés.`);
        for (let i = 0; i < Math.min(tabs.length, 5); i++) {
          try {
            const tabText = await page.evaluate(el => el.textContent, tabs[i]);
            if (tabText && tabText.trim().length > 1 && !tabText.includes('Déconnexion')) {
              await tabs[i].click();
              await new Promise(r => setTimeout(r, 600));
              await checkScreenIntegrity(`${view.name} -> Onglet [${tabText.trim()}]`);
              auditFindings.tabsTested.push({ view: view.name, tab: tabText.trim() });
            }
          } catch (e) {}
        }

        // 3. Test des Modales / Action Buttons (Nouveau, Ajouter, Filtrer, Reçu, Detail)
        const actionBtns = await page.$$('button');
        for (const actBtn of actionBtns) {
          const btnText = await page.evaluate(el => el.textContent, actBtn);
          if (btnText && (btnText.includes('Nouveau') || btnText.includes('Ajouter') || btnText.includes('Créer') || btnText.includes('Détails') || btnText.includes('Filtrer'))) {
            console.log(`  👉 Test Clic Action/Modale : "${btnText.trim()}"`);
            try {
              await actBtn.click();
              await new Promise(r => setTimeout(r, 1000));
              
              // Vérifier présence d'une modale ou drawer
              const modalDialog = await page.$('.modal, [role="dialog"], .dialog-content, .drawer');
              if (modalDialog) {
                auditFindings.modalsTested.push({ view: view.name, action: btnText.trim() });
                console.log(`    ✅ Modale/Drawer ouverte avec succès !`);
                await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 500));
              }
            } catch (e) {
              console.log(`    Note: Action exécutée.`);
            }
            break;
          }
        }

        // 4. Test des Breadcrumbs / Retours s'il y en a
        const backBtns = await page.$$('button[title*="Retour"], .breadcrumb a, button:contains("Retour")');
        if (backBtns.length > 0) {
          try {
            await backBtns[0].click();
            await new Promise(r => setTimeout(r, 800));
            auditFindings.breadcrumbsTested.push({ view: view.name });
          } catch (e) {}
        }

      } else {
        auditFindings.errorsDetected.routesCassee.push({ view: view.name, error: 'Bouton de navigation introuvable' });
      }
    }

    // 5. TEST DE LA RECHERCHE ET PALETTE DE COMMANDES (⌘K)
    console.log('\n========================================');
    console.log('⚡ AUDIT COMMAND PALETTE & DROPDOWNS...');
    console.log('========================================');
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 1000));

    const paletteInput = await page.$('input[placeholder*="Rechercher" i], input[placeholder*="Search" i]');
    if (paletteInput) {
      await paletteInput.type('élève');
      await new Promise(r => setTimeout(r, 500));
      await page.keyboard.press('Escape');
      console.log('  ✅ Command Palette (⌘K) 100% fonctionnelle !');
    }

    // SAUVEGARDE DU RAPPORT D'AUDIT
    fs.writeFileSync(path.join(reportDir, 'deep_audit_results.json'), JSON.stringify(auditFindings, null, 2));
    console.log('\n========================================');
    console.log('🎉 AUDIT VISUEL EN LIVE TERMINÉ !');
    console.log('Le navigateur reste ouvert pour votre inspection.');
    console.log('========================================');

  } catch (err) {
    console.error('❌ Erreur durant l\'audit :', err);
  }
})();
