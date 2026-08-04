const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const CHROME_DEV_PATH = 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe';
const reportPath = path.join(__dirname, 'chrome_devtools_results.json');

(async () => {
  console.log('🚀 DÉMARRAGE DE L\'AUDIT CHROMEDEVTOOLS & RUNTIME CONSOLE...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_DEV_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const devToolsMetrics = {
    jsErrors: [],
    reactErrors: [],
    warnings: [],
    promiseRejections: [],
    networkErrors: [],
    errors404: [],
    errors500: [],
    slowRequests: [],
    cssErrors: [],
    hydrationErrors: []
  };

  // Ecouter la console
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();

    if (type === 'error') {
      if (text.includes('React') || text.includes('ErrorBoundary')) {
        devToolsMetrics.reactErrors.push(text);
      } else if (text.includes('Hydration') || text.includes('did not match')) {
        devToolsMetrics.hydrationErrors.push(text);
      } else {
        devToolsMetrics.jsErrors.push(text);
      }
    } else if (type === 'warning') {
      devToolsMetrics.warnings.push(text);
    }
  });

  // Ecouter les unhandled promise rejections
  page.on('pageerror', err => {
    devToolsMetrics.jsErrors.push(err.toString());
  });

  // Ecouter les requêtes réseau
  const requestStartTimes = new Map();

  page.on('request', req => {
    requestStartTimes.set(req.url(), Date.now());
  });

  page.on('requestfailed', req => {
    devToolsMetrics.networkErrors.push({
      url: req.url(),
      failure: req.failure() ? req.failure().errorText : 'Failed'
    });
  });

  page.on('response', res => {
    const status = res.status();
    const url = res.url();
    const startTime = requestStartTimes.get(url);
    if (startTime) {
      const duration = Date.now() - startTime;
      if (duration > 1500) {
        devToolsMetrics.slowRequests.push({ url, durationMs: duration });
      }
    }

    if (status === 404) {
      devToolsMetrics.errors404.push(url);
    } else if (status >= 500) {
      devToolsMetrics.errors500.push(url);
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
    await new Promise(r => setTimeout(r, 1500));

    // Traverser les 18 vues principales
    const views = [
      'Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Présences',
      'Emploi du temps', 'Notes', 'Bulletins', 'Encaissements', 'Dossiers Financiers',
      'Cantine', 'Transport', 'Dépenses', 'Rapports', 'Statistiques', 'Paramètres'
    ];

    for (const viewName of views) {
      console.log(`🌐 EXPLORATION DEVTOOLS VUE : [${viewName}]`);
      const navBtns = await page.$$('.sidebar-item, button, a');
      for (const b of navBtns) {
        const txt = await page.evaluate(el => el.textContent, b);
        if (txt && txt.includes(viewName)) {
          await b.click();
          await new Promise(r => setTimeout(r, 800));
          break;
        }
      }
    }

    fs.writeFileSync(reportPath, JSON.stringify(devToolsMetrics, null, 2));
    console.log('✅ AUDIT CHROMEDEVTOOLS TERMINÉ AVEC SUCCÈS.');

    await browser.close();
  } catch (err) {
    console.error('Erreur audit devtools :', err);
    await browser.close();
  }
})();
