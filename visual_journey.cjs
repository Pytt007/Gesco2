const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotDir = 'C:\\Users\\silve\\.gemini\\antigravity-ide\\brain\\7246451d-3e61-49bf-a032-979871295d4e';

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  console.log('Launching browser in headful mode...');
  const browser = await puppeteer.launch({
    headless: false, // VISUAL MODE: Open the actual browser window!
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3001 ...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Take screenshot of Login page
    await page.screenshot({ path: path.join(screenshotDir, '1_login_page.png') });

    // Click quick connect button for Admin Général
    const buttons = await page.$$('button');
    let quickConnectBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Admin Général')) {
        quickConnectBtn = btn;
        break;
      }
    }

    if (quickConnectBtn) {
      console.log('Clicking Admin Général quick connect...');
      await quickConnectBtn.click();
    } else {
      console.log('Admin Général quick connect button not found, trying fallback inputs...');
      await page.type('input[placeholder*="admin"]', 'admin');
      await page.type('input[placeholder="••••••••"]', 'admin');
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(screenshotDir, '2_dashboard.png') });

    // Click "Scolarité" sidebar navigation button
    const navButtons = await page.$$('.sidebar-nav-btn, button');
    let scolariteBtn = null;
    for (const btn of navButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Scolarité')) {
        scolariteBtn = btn;
        break;
      }
    }

    if (scolariteBtn) {
      console.log('Navigating to Scolarité...');
      await scolariteBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(screenshotDir, '3_scolarite_view.png') });

      // Click "Nouveau" button
      const actionButtons = await page.$$('button');
      let nouveauBtn = null;
      for (const btn of actionButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.trim() === 'Nouveau') {
          nouveauBtn = btn;
          break;
        }
      }

      if (nouveauBtn) {
        console.log('Opening Nouveau Dossier d\'Inscription modal...');
        await nouveauBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(screenshotDir, '4_new_student_modal.png') });

        // Fill form
        console.log('Filling registration form...');
        await page.type('input[placeholder="Ex: DOUMBIA"]', 'ALIOU');
        await page.type('input[placeholder="Ex: Seydou"]', 'Mariam');
        await page.type('input[placeholder="0"]', '50000'); // Payé Inscription
        await page.type('input[placeholder="Ex: 6"]', '8'); // Âge
        
        await page.select('select', 'CE1'); 
        
        const selects = await page.$$('select');
        if (selects.length >= 2) {
          await page.evaluate(el => {
            el.value = 'Féminin';
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, selects[1]);
        }

        await page.type('input[placeholder="Nom complet du tuteur"]', 'M. ALIOU Koffi');
        await page.type('input[placeholder="Téléphone du parent"]', '+225 07070707');
        await page.type('input[placeholder="Contact d\'urgence"]', '+225 08080808');
        await page.type('input[placeholder="Adresse complète"]', 'Abidjan Cocody');

        await page.screenshot({ path: path.join(screenshotDir, '5_form_filled.png') });
        await new Promise(r => setTimeout(r, 1000));

        // Click "Créer le dossier"
        let createBtn = null;
        const modalButtons = await page.$$('button');
        for (const btn of modalButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Créer le dossier')) {
            createBtn = btn;
            break;
          }
        }

        if (createBtn) {
          console.log('Submitting the form...');
          await createBtn.click();
          await new Promise(r => setTimeout(r, 3000));
          await page.screenshot({ path: path.join(screenshotDir, '6_scolarite_updated.png') });
        }
      }
    }

    // Go to "Élèves"
    console.log('Navigating to Students page...');
    const navButtons2 = await page.$$('.sidebar-nav-btn, button');
    let studentsBtn = null;
    for (const btn of navButtons2) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Élèves')) {
        studentsBtn = btn;
        break;
      }
    }
    if (studentsBtn) {
      await studentsBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(screenshotDir, '7_students_list.png') });
    }

    // Go to "Cantine"
    console.log('Navigating to Canteen page...');
    const navButtons3 = await page.$$('.sidebar-nav-btn, button');
    let canteenBtn = null;
    for (const btn of navButtons3) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Cantine')) {
        canteenBtn = btn;
        break;
      }
    }
    if (canteenBtn) {
      await canteenBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(screenshotDir, '8_canteen_view.png') });
    }

    // Go to "Transport"
    console.log('Navigating to Transport page...');
    const navButtons4 = await page.$$('.sidebar-nav-btn, button');
    let transportBtn = null;
    for (const btn of navButtons4) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Transport')) {
        transportBtn = btn;
        break;
      }
    }
    if (transportBtn) {
      await transportBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(screenshotDir, '9_transport_view.png') });
    }

    // Return to "Dashboard"
    console.log('Navigating back to Dashboard...');
    const navButtons5 = await page.$$('.sidebar-nav-btn, button');
    let dashboardBtn = null;
    for (const btn of navButtons5) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Dashboard')) {
        dashboardBtn = btn;
        break;
      }
    }
    if (dashboardBtn) {
      await dashboardBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: path.join(screenshotDir, '10_dashboard_final.png') });
    }

    console.log('Test complete! Leaving the browser open as requested.');
  } catch (error) {
    console.error('An error occurred during automation:', error);
  }
})();
