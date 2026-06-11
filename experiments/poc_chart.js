const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Navigating to TradingView Chart...');
  await page.goto('https://www.tradingview.com/chart/?symbol=EGX:COMI');
  
  // Wait for the chart legend to appear
  await page.waitForTimeout(10000); // 10 seconds to ensure chart loads

  const data = await page.evaluate(() => {
    // The OHLC data in the chart legend
    // TradingView usually puts this in divs with classes like "legend-XXXX" or "values-XXXX"
    
    // We can just grab all text from the top-left legend area
    const legend = document.querySelector('.chart-legend') || document.querySelector('[class*="legend"]');
    
    // Specifically looking for the values
    const valueItems = Array.from(document.querySelectorAll('[class*="valueValue"]')).map(el => el.innerText);
    
    // For OHLC, the classes are often like:
    // [data-name="legend-series-item"] -> [data-id="series-open"], [data-id="series-high"], etc. (Sometimes they use different data-ids)
    
    const tryGetDataId = (id) => {
        const el = document.querySelector(`[data-id="${id}"]`);
        return el ? el.innerText : null;
    };

    // Another approach: get all divs with text in the top-left area
    const layout = document.querySelector('.layout__area--center') || document.body;
    
    return {
        title: document.title,
        valuesFromClass: valueItems,
        // Sometimes OHLC is displayed in elements with these classes:
        legendText: legend ? legend.innerText : 'Legend not found',
        open: tryGetDataId('series-open'),
        high: tryGetDataId('series-high'),
        low: tryGetDataId('series-low'),
        close: tryGetDataId('series-close'),
    };
  });

  console.log('Scraped Data:', JSON.stringify(data, null, 2));

  await page.screenshot({ path: 'chart_screenshot.png' });
  await browser.close();
})();
