const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Navigating...');
  await page.goto('https://www.tradingview.com/symbols/EGX-COMI/');
  
  await page.waitForTimeout(5000);

  // We can evaluate in browser context to find elements
  const data = await page.evaluate(() => {
    // Helper to find element with specific text or class
    const title = document.title;
    
    // TradingView often uses h1 for symbol name
    const h1 = document.querySelector('h1')?.innerText || '';
    
    // The current price is usually in a huge font size or specific class
    // Let's grab all span and div elements and find the ones that look like prices
    const getByClassIncludes = (str) => {
        return Array.from(document.querySelectorAll(`[class*="${str}"]`)).map(e => e.innerText).slice(0, 5);
    };

    return {
        title,
        h1,
        // Common TV classes
        lastPriceClasses: getByClassIncludes('last-'),
        priceClasses: getByClassIncludes('price'),
        symbolClasses: getByClassIncludes('symbol'),
        rangeClasses: getByClassIncludes('range'),
        highLow: getByClassIncludes('high'),
        
        // Also let's try to get the whole header text
        headerText: document.querySelector('header')?.innerText || '',
        mainText: document.querySelector('main')?.innerText.substring(0, 1000) || '',
    };
  });

  console.log(JSON.stringify(data, null, 2));

  await browser.close();
})();
