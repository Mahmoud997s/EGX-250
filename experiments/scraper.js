const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to TradingView...');
  await page.goto('https://www.tradingview.com/symbols/EGX-COMI/');
  
  // Wait for some key elements to load (just waiting on the generic page container)
  await page.waitForTimeout(5000);

  // Take a screenshot for visual debugging if needed
  await page.screenshot({ path: 'screenshot.png' });

  // Extract the page's HTML to analyze the selectors
  const html = await page.content();
  fs.writeFileSync('page.html', html);

  console.log('Saved page.html and screenshot.png. You can analyze them to find selectors.');

  // Try to find Symbol and Company Name generically as a start
  try {
      const title = await page.title();
      console.log('Page Title:', title);
  } catch(e) {}

  await browser.close();
})();
