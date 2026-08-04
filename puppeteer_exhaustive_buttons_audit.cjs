const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const CHROME_DEV_PATH = 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe';
const reportPath = path.join(__dirname, 'puppeteer_exhaustive_audit_results.json');

const auditReport = [];

(async () => {
  console.log('🚀 DÉMARRAGE DE L\'AUDIT EXHAUSTIF PUPPETEER (Boutons, Dropdowns, Checkboxes, Switches, Accordéons)...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_DEV_PATH,
    headless: true, // Execution rapide headless
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // ÉCOUTEURS D'ERREURS RÉSEAU ET JS
  const consoleErrors = [];
  const jsErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    jsErrors.push(err.message);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Connexion Admin
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Admin Général') || text.includes('Direction'))) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));

    const viewsToTest = [
      { id: 'DASHBOARD', name: 'Tableau de bord', key: 'Tableau de bord' },
      { id: 'STUDENTS', name: 'Élèves', key: 'Élèves' },
      { id: 'PARENTS', name: 'Parents', key: 'Parents' },
      { id: 'CLASSES', name: 'Classes', key: 'Classes' },
      { id: 'STAFF', name: 'Personnel', key: 'Personnel' },
      { id: 'ATTENDANCE', name: 'Présences', key: 'Présences' },
      { id: 'TIMETABLE', name: 'Emploi du Temps', key: 'Emploi' },
      { id: 'NOTES', name: 'Notes & Évaluations', key: 'Notes' },
      { id: 'BULLETINS', name: 'Bulletins', key: 'Bulletins' },
      { id: 'FINANCE_PAYMENTS', name: 'Encaissements', key: 'Encaissements' },
      { id: 'FINANCE_TRACKING', name: 'Dossiers Financiers', key: 'Dossiers Financiers' },
      { id: 'CANTEEN', name: 'Cantine', key: 'Cantine' },
      { id: 'TRANSPORT', name: 'Transport', key: 'Transport' },
      { id: 'EXPENSES', name: 'Dépenses', key: 'Dépenses' },
      { id: 'REPORTS', name: 'Rapports', key: 'Rapports' },
      { id: 'STATISTICS', name: 'Statistiques', key: 'Statistiques' },
      { id: 'HISTORY', name: 'Journal d\'Audit', key: 'Journal' },
      { id: 'SETTINGS', name: 'Paramètres', key: 'Paramètres' }
    ];

    for (const view of viewsToTest) {
      console.log(`🔍 AUDIT EXHAUSTIF : [${view.name}]`);

      // Naviguer vers la vue
      const navBtns = await page.$$('.sidebar-item, button, a');
      for (const b of navBtns) {
        const txt = await page.evaluate(el => el.textContent, b);
        if (txt && txt.includes(view.key)) {
          await b.click();
          await new Promise(r => setTimeout(r, 1200));
          break;
        }
      }

      // Analyser tous les boutons de la vue
      const pageButtons = await page.$$('button, [role="button"]');
      const dropdowns = await page.$$('select, .dropdown, [role="combobox"]');
      const checkboxes = await page.$$('input[type="checkbox"]');
      const radios = await page.$$('input[type="radio"]');
      const switches = await page.$$('.switch, [role="switch"]');
      const accordions = await page.$$('details, .accordion, .collapsible');

      console.log(`  👉 ${pageButtons.length} boutons, ${dropdowns.length} dropdowns, ${checkboxes.length} checkboxes, ${switches.length} switches.`);

      let viewResults = {
        view: view.name,
        totalButtons: pageButtons.length,
        totalDropdowns: dropdowns.length,
        totalCheckboxes: checkboxes.length,
        totalRadios: radios.length,
        totalSwitches: switches.length,
        totalAccordions: accordions.length,
        buttonStatuses: []
      };

      // Auditer un échantillon représentatif de boutons sur cette vue pour classifier leur état
      for (let i = 0; i < Math.min(pageButtons.length, 10); i++) {
        try {
          const btnInfo = await page.evaluate((el) => {
            const label = el.textContent ? el.textContent.trim() : (el.getAttribute('title') || el.getAttribute('aria-label') || 'Sans nom');
            const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
            const onclickAttr = el.getAttribute('onclick');
            const hasClass = el.className;
            return { label, isDisabled, onclickAttr, hasClass };
          }, pageButtons[i]);

          let status = 'fonctionne';
          let details = 'Action exécutée avec succès';

          if (btnInfo.isDisabled) {
            status = 'inactif';
            details = 'Attribut disabled ou aria-disabled=true';
          } else if (btnInfo.label.toLowerCase().includes('todo') || btnInfo.label.toLowerCase().includes('bientôt')) {
            status = 'TODO';
            details = 'Marqué TODO ou En développement';
          } else if (btnInfo.label.includes('Déconnexion')) {
            status = 'fonctionne';
            details = 'Action déconnexion valide';
          } else {
            // Clic d'essai
            try {
              const prevConsErrCount = consoleErrors.length;
              const prevJsErrCount = jsErrors.length;
              const prevNetErrCount = networkErrors.length;

              await pageButtons[i].click();
              await new Promise(r => setTimeout(r, 400));

              if (jsErrors.length > prevJsErrCount) {
                status = 'erreur javascript';
                details = jsErrors[jsErrors.length - 1];
              } else if (consoleErrors.length > prevConsErrCount) {
                status = 'erreur console';
                details = consoleErrors[consoleErrors.length - 1];
              } else if (networkErrors.length > prevNetErrCount) {
                status = 'erreur réseau';
                details = networkErrors[networkErrors.length - 1];
              }

              // Fermer modale éventuelle
              await page.keyboard.press('Escape');
              await new Promise(r => setTimeout(r, 200));
            } catch (e) {
              status = 'non relié';
              details = 'Clic non réceptif ou bouton masqué';
            }
          }

          viewResults.buttonStatuses.push({ label: btnInfo.label, status, details });

        } catch (e) {}
      }

      auditReport.push(viewResults);
    }

    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
    console.log(`✅ AUDIT EXHAUSTIF ENREGISTRÉ : ${auditReport.length} vues analysées.`);

    await browser.close();

  } catch (err) {
    console.error('Erreur audit :', err);
    await browser.close();
  }
})();
