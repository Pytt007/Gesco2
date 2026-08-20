const puppeteer = require('puppeteer');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('--- Starting Multi-User Realtime Synchronization Test ---');

  // Launch User A (Admin)
  const browserA = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const pageA = await browserA.newPage();
  await pageA.setViewport({ width: 1280, height: 800 });

  // Launch User B (Second user / observer)
  const browserB = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const pageB = await browserB.newPage();
  await pageB.setViewport({ width: 1280, height: 800 });

  try {
    console.log('1. User A logs in...');
    await pageA.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await pageA.type('#login-username', 'admin');
    await pageA.type('#login-password', 'admin123');
    await pageA.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    console.log('2. User B logs in...');
    await pageB.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await pageB.type('#login-username', 'admin');
    await pageB.type('#login-password', 'admin123');
    await pageB.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    console.log('3. Navigating both users to Personnel (StaffPage)...');
    // Navigate User A to Staff
    await pageA.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const staffLink = links.find(el => el.textContent && el.textContent.includes('Personnel'));
      if (staffLink) staffLink.click();
    });
    // Navigate User B to Staff
    await pageB.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const staffLink = links.find(el => el.textContent && el.textContent.includes('Personnel'));
      if (staffLink) staffLink.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('4. User A creating a new staff member...');
    const testLastName = `TestSync_${Date.now()}`;
    const testPhone = `07${Math.floor(10000000 + Math.random() * 90000000)}`;

    const createSuccess = await pageA.evaluate(async (lastName, phone) => {
      try {
        const { createStaff } = await import('/src/services/staff/staffService.ts');
        const res = await createStaff({
          firstName: 'SyncUser',
          lastName: lastName,
          role: 'Enseignant',
          phonePrimary: phone,
          email: `sync.${Date.now()}@gesco.ci`,
          baseSalary: 300000
        });
        return res.success;
      } catch (e) {
        return false;
      }
    }, testLastName, testPhone);

    console.log('Staff creation result on User A:', createSuccess);

    console.log('5. Waiting 3 seconds for Supabase Realtime synchronization on User B...');
    await new Promise(r => setTimeout(r, 3000));

    const userBSeesNewStaff = await pageB.evaluate((lastName) => {
      return document.body.innerText.includes(lastName);
    }, testLastName);

    console.log(`6. Does User B see the new staff member without manual refresh? -> ${userBSeesNewStaff ? '✅ YES (SYNC SUCCESS)' : '❌ NO'}`);

    // Capture proof screenshot
    await pageB.screenshot({ path: 'tests/multiuser_sync_proof.png' });

    console.log('--- Test Completed Successfully ---');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browserA.close();
    await browserB.close();
  }
})();
