const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const screenshotsDir = path.join(__dirname, 'dark_audit_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Login
  await page.type('#login-username', 'admin');
  await page.type('#login-password', 'admin123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  // Set dark mode
  await page.evaluate(() => {
    localStorage.setItem('gesco-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 500));

  const navItems = [
    { name: '01_dashboard', text: 'Tableau de bord' },
    { name: '02_students', text: 'Élèves' },
    { name: '03_parents', text: 'Parents' },
    { name: '04_classes', text: 'Classes' },
    { name: '05_staff', text: 'Personnel' },
    { name: '06_attendance', text: 'Présences' },
    { name: '07_timetable', text: 'Emploi du Temps' },
    { name: '08_notes', text: 'Notes & Éval.' },
    { name: '09_bulletins', text: 'Bulletins' },
    { name: '10_encaissements', text: 'Encaissements' },
    { name: '11_dossiers_financiers', text: 'Dossiers Financiers' },
    { name: '12_cantine', text: 'Cantine' },
    { name: '13_transport', text: 'Transport' },
    { name: '14_depenses', text: 'Dépenses' },
    { name: '15_rapports', text: 'Rapports' },
    { name: '16_statistiques', text: 'Statistiques' },
    { name: '17_journal_audit', text: 'Journal d\'Audit' },
    { name: '18_settings', text: 'Paramètres' },
  ];

  for (const item of navItems) {
    const clicked = await page.evaluate((targetText) => {
      const all = Array.from(document.querySelectorAll('.sidebar-item, .sidebar-link, a, button, span'));
      const found = all.find(el => el.textContent && el.textContent.trim() === targetText);
      if (found) {
        found.click();
        return true;
      }
      return false;
    }, item.text);

    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, `${item.name}.png`) });
    console.log(`Saved screenshot for ${item.name} (clicked: ${clicked})`);
  }

  await browser.close();
  console.log('All screenshots captured!');
})();
