const puppeteer = require('puppeteer');

(async () => {
  console.log('🎬 Démarrage du test en direct (Live Visual Demo)...');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 800, // Ralentit les actions de 800ms pour qu'elles soient parfaitement visibles à l'écran
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('📍 1. Navigation vers l\'application GESCO...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    console.log('🔑 2. Connexion en tant que Directeur Général...');
    const quickBtns = await page.$$('button');
    for (const btn of quickBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Direction') || text.includes('Admin Général'))) {
        await btn.click();
        console.log('✅ Bouton de connexion cliqué !');
        break;
      }
    }

    await new Promise(r => setTimeout(r, 2000));

    console.log('🔍 3. Parcours interactif en direct des modules...');
    const modulesToVisit = [
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
      'Paramètres',
      'Dashboard'
    ];

    for (const mod of modulesToVisit) {
      console.log(`▶️ Visite du module : [${mod}]`);
      const buttons = await page.$$('button, .sidebar-item');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.toLowerCase().includes(mod.toLowerCase())) {
          await btn.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log('✨ Démonstration en direct terminée avec succès ! Le navigateur reste ouvert.');
  } catch (err) {
    console.error('Erreur pendant le live:', err);
  }
})();
