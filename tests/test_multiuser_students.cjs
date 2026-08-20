const puppeteer = require('puppeteer');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('--- Testing Students Realtime Multi-User Sync ---');

  const browserA = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const pageA = await browserA.newPage();
  await pageA.setViewport({ width: 1280, height: 800 });

  const browserB = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const pageB = await browserB.newPage();
  await pageB.setViewport({ width: 1280, height: 800 });

  try {
    // Login User A
    await pageA.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await pageA.type('#login-username', 'admin');
    await pageA.type('#login-password', 'admin123');
    await pageA.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    // Login User B
    await pageB.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await pageB.type('#login-username', 'admin');
    await pageB.type('#login-password', 'admin123');
    await pageB.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    // Navigate User A and B to Students (Élèves)
    await pageA.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const link = links.find(el => el.textContent && el.textContent.includes('Élèves'));
      if (link) link.click();
    });
    await pageB.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const link = links.find(el => el.textContent && el.textContent.includes('Élèves'));
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const testStudentLastName = `KOUAME_SYNC_${Date.now()}`;
    const testMatricule = `MAT-SYNC-${Date.now().toString().slice(-4)}`;

    console.log('Creating new student on User A:', testStudentLastName);
    const createRes = await pageA.evaluate(async (lastName, matricule) => {
      try {
        const { createStudent } = await import('/src/services/students/studentsService.ts');
        const res = await createStudent({
          firstName: 'Amara',
          lastName: lastName,
          matricule: matricule,
          gender: 'Masculin',
          grade: '6ème',
          status: 'Actif',
        });
        return res.success;
      } catch (e) {
        return false;
      }
    }, testStudentLastName, testMatricule);

    console.log('Student created by User A:', createRes);
    console.log('Waiting 3s for User B UI update...');
    await new Promise(r => setTimeout(r, 3000));

    const userBSeesStudent = await pageB.evaluate((lastName) => {
      return document.body.innerText.includes(lastName);
    }, testStudentLastName);

    console.log(`Does User B see the new student in real time? -> ${userBSeesStudent ? '✅ YES (SYNC SUCCESS)' : '❌ NO'}`);

  } catch (e) {
    console.error('Test error:', e);
  } finally {
    await browserA.close();
    await browserB.close();
  }
})();
