const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const conversationId = '92bdeceb-3afb-4957-a6a0-9ad710ca8809';
const brainDir = path.join(process.env.USERPROFILE || 'C:\\Users\\silve', '.gemini', 'antigravity-ide', 'brain', conversationId);

if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}

(async () => {
  console.log('📸 Generation du rapport visuel complet...');
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const capturedScreenshots = [];

  try {
    console.log('📍 Connexion a http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 1: Login
    const loginImg = path.join(brainDir, '01_login.png');
    await page.screenshot({ path: loginImg });
    capturedScreenshots.push({ title: 'Page de Connexion', path: loginImg });

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

    // Dashboard
    const dashImg = path.join(brainDir, '02_dashboard.png');
    await page.screenshot({ path: dashImg });
    capturedScreenshots.push({ title: 'Tableau de bord (Dashboard)', path: dashImg });

    // Vues a visiter
    const views = [
      { id: 'STUDENTS', name: 'Gestion des Élèves', key: 'Élèves', file: '03_eleves.png' },
      { id: 'PARENTS', name: 'Gestion des Parents', key: 'Parents', file: '04_parents.png' },
      { id: 'CLASSES', name: 'Gestion des Classes', key: 'Classes', file: '05_classes.png' },
      { id: 'STAFF', name: 'Personnel & Enseignants', key: 'Personnel', file: '06_personnel.png' },
      { id: 'ATTENDANCE', name: 'Gestion des Présences', key: 'Présences', file: '07_presences.png' },
      { id: 'TIMETABLE', name: 'Emploi du Temps', key: 'Emploi', file: '08_emploi_temps.png' },
      { id: 'NOTES', name: 'Notes & Évaluations', key: 'Notes', file: '09_notes.png' },
      { id: 'BULLETINS', name: 'Bulletins de Notes', key: 'Bulletins', file: '10_bulletins.png' },
      { id: 'FINANCE_PAYMENTS', name: 'Encaissements & Caisse', key: 'Encaissements', file: '11_encaissements.png' },
      { id: 'CANTEEN', name: 'Service Restauration (Cantine)', key: 'Cantine', file: '12_cantine.png' },
      { id: 'TRANSPORT', name: 'Service Transport Scolaire', key: 'Transport', file: '13_transport.png' },
      { id: 'STATISTICS', name: 'Statistiques & Analyses', key: 'Statistiques', file: '14_statistiques.png' },
      { id: 'SETTINGS', name: 'Paramètres du Système', key: 'Paramètres', file: '15_parametres.png' }
    ];

    for (const v of views) {
      const navBtns = await page.$$('.sidebar-item, button');
      for (const btn of navBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes(v.key)) {
          await btn.click();
          await new Promise(r => setTimeout(r, 1200));
          const imgPath = path.join(brainDir, v.file);
          await page.screenshot({ path: imgPath });
          capturedScreenshots.push({ title: v.name, path: imgPath });
          break;
        }
      }
    }

    await browser.close();
    console.log(`✅ ${capturedScreenshots.length} captures effectuées avec succès !`);

  } catch (err) {
    console.error('Erreur :', err);
    await browser.close();
  }
})();
