const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Navigating to TradingView Chart...');
  await page.goto('https://www.tradingview.com/chart/?symbol=EGX:COMI');
  
  await page.waitForTimeout(10000);

  const data = await page.evaluate(() => {
    const results = {};
    
    // Find the elements that contain O, H, L, C values
    const valueElements = Array.from(document.querySelectorAll('[class*="valueValue"]'));
    if (valueElements.length >= 4) {
      results.Open = valueElements[1].innerText;
      results.High = valueElements[2].innerText;
      results.Low = valueElements[3].innerText;
      results.Close = valueElements[4].innerText;
      
      results.OpenClass = valueElements[1].className;
      results.HighClass = valueElements[2].className;
      results.LowClass = valueElements[3].className;
      results.CloseClass = valueElements[4].className;
    }
    
    // Company Name and Symbol
    const titleElement = document.querySelector('[class*="title-"]');
    if (titleElement) {
        results.CompanyName = titleElement.innerText;
        results.CompanyNameClass = titleElement.className;
    }

    results.allLegendClasses = Array.from(document.querySelectorAll('.chart-legend [class]')).map(el => el.className).slice(0, 20);

    return results;
  });

  console.log(JSON.stringify(data, null, 2));

  await browser.close();
})();
