const puppeteer = require('puppeteer');
const fs = require('fs');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function getExecutablePath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'laptop_1024', width: 1024, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 },
];

async function runResponsiveTests() {
  const execPath = getExecutablePath();
  console.log('Using browser executable:', execPath || 'Default Puppeteer Chromium');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: execPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    console.log(`\n================ Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ================`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Measure layout metrics
    const metrics = await page.evaluate(() => {
      const content = document.querySelector('.gesco-content');
      const main = document.querySelector('.gesco-main');
      const sidebar = document.querySelector('.sidebar');
      const menuToggle = document.querySelector('.mobile-menu-toggle');
      const headerTitle = document.querySelector('.header-title');

      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowWidth: window.innerWidth,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
        mainMarginLeft: main ? window.getComputedStyle(main).marginLeft : null,
        mainWidth: main ? main.clientWidth : null,
        sidebarTransform: sidebar ? window.getComputedStyle(sidebar).transform : null,
        menuToggleVisible: menuToggle ? window.getComputedStyle(menuToggle).display !== 'none' : false,
        headerTitleText: headerTitle ? headerTitle.textContent.trim() : null,
      };
    });

    console.log('Viewport metrics:', JSON.stringify(metrics, null, 2));

    if (metrics.hasHorizontalOverflow) {
      console.warn(`[WARN] Page has horizontal overflow on ${vp.name}! ScrollWidth: ${metrics.bodyScrollWidth} > WindowWidth: ${metrics.windowWidth}`);
    } else {
      console.log(`[PASS] Zero horizontal overflow on ${vp.name}. Clean layout!`);
    }

    if (vp.width <= 768) {
      console.log(`Checking mobile drawer toggle...`);
      // Click hamburger button to open drawer
      const toggle = await page.$('.mobile-menu-toggle');
      if (toggle) {
        await toggle.click();
        await new Promise((r) => setTimeout(r, 400));
        const isOpen = await page.evaluate(() => {
          const sb = document.querySelector('.sidebar');
          return sb ? sb.classList.contains('mobile-open') : false;
        });
        console.log(`Sidebar mobile open status after toggle click:`, isOpen ? 'SUCCESS (Open)' : 'FAILED');

        // Click backdrop or close button to close
        const backdrop = await page.$('.sidebar-backdrop');
        if (backdrop) {
          await backdrop.click();
          await new Promise((r) => setTimeout(r, 400));
          const isClosed = await page.evaluate(() => {
            const sb = document.querySelector('.sidebar');
            return sb ? !sb.classList.contains('mobile-open') : true;
          });
          console.log(`Sidebar mobile close status after backdrop click:`, isClosed ? 'SUCCESS (Closed)' : 'FAILED');
        }
      }
    }
  }

  await browser.close();
  console.log('\nAll Responsive Viewport Tests Completed Successfully!');
}

runResponsiveTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
