const { chromium } = require('playwright');

(async () => {
  // Launch browser in headed mode as requested by the user
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const symbol = 'EGX:COMI';
  console.log(`Navigating to TradingView Chart for ${symbol}...`);
  await page.goto(`https://www.tradingview.com/chart/?symbol=${symbol}`);
  
  // Wait for the chart legend to render completely
  await page.waitForSelector('.chart-legend', { timeout: 15000 });
  await page.waitForTimeout(5000); // Give it some time to stabilize the numbers

  const extractedData = await page.evaluate(() => {
    // 1. Company Name
    // Usually located in an element with class containing 'title-' in the legend
    const companyNameEl = document.querySelector('[class*="title-"]');
    const companyName = companyNameEl ? companyNameEl.innerText : 'Unknown';

    // 2. Symbol
    // Can be found in the title or we know it from the request
    const symbolText = document.title.split(' ')[0];

    // 3. High, Low, Close
    // TradingView Superchart legend puts OHLC values in elements with classes containing 'valueValue-'
    // They are ordered: [?, Open, High, Low, Close, ...]
    const valueElements = Array.from(document.querySelectorAll('.chart-legend [class*="valueValue"]'));
    
    let high = 'N/A', low = 'N/A', close = 'N/A';
    if (valueElements.length >= 5) {
      // Index 2 is High, Index 3 is Low, Index 4 is Close
      high = valueElements[2].innerText;
      low = valueElements[3].innerText;
      close = valueElements[4].innerText;
    }

    return {
      symbol: symbolText,
      companyName: companyName,
      high: high,
      low: low,
      close: close
    };
  });

  console.log('\n--- Extraction Results ---');
  console.log(`Symbol:       ${extractedData.symbol}`);
  console.log(`Company Name: ${extractedData.companyName}`);
  console.log(`High (H):     ${extractedData.high}`);
  console.log(`Low (L):      ${extractedData.low}`);
  console.log(`Close (C):    ${extractedData.close}`);
  console.log('--------------------------\n');

  await browser.close();
})();
