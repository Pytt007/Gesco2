const puppeteer = require('puppeteer');

(async () => {
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

  // Test Dark Mode Hover
  await page.evaluate(() => {
    localStorage.setItem('gesco-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.hover('.sidebar-user');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'tests/sidebar_user_hover_dark.png' });

  // Test Light Mode Hover
  await page.evaluate(() => {
    localStorage.setItem('gesco-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.hover('.sidebar-user');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'tests/sidebar_user_hover_light.png' });

  await browser.close();
  console.log('Hover screenshots captured successfully!');
})();
