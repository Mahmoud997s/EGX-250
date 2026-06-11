const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Extracts data for a specific symbol and timeframe.
 * @param {import('playwright').BrowserContext} context 
 * @param {string} symbol e.g., 'EGX:COMI'
 * @param {string} timeframe e.g., '1D', '1W', '1M'
 * @param {number} runIndex For logging purposes
 */
async function extractData(context, symbol, timeframe, runIndex) {
    const page = await context.newPage();
    const startTime = new Date().toISOString();
    const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}`;
    
    let status = 'SUCCESS';
    let errorDetails = null;
    let extractedData = null;
    let screenshotPath = `screenshot_run_${runIndex}.png`;

    try {
        console.log(`[Run ${runIndex}] Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for the chart legend to render completely
        try {
            await page.waitForSelector('[class*="legend-"]', { timeout: 15000 });
        } catch (e) {
            console.log(`[Run ${runIndex}] Warning: [class*="legend-"] not found. Trying fallback...`);
            await page.waitForSelector('.chart-legend', { timeout: 10000 });
        }
        await page.waitForTimeout(4000); // Wait for data to stabilize
        
        extractedData = await page.evaluate((sym) => {
            const result = {
                symbol: 'N/A',
                companyName: 'N/A',
                open: null,
                high: null,
                low: null,
                close: null,
                currentPrice: null,
                timestamp: new Date().toISOString(),
                source: 'TradingView',
                url: window.location.href
            };

            // 1. Symbol & Current Price from Title
            const titleParts = document.title.split(' ');
            if (titleParts.length > 1) {
                result.symbol = titleParts[0]; 
                const parsedPrice = parseFloat(titleParts[1].replace(/,/g, ''));
                if (!isNaN(parsedPrice)) {
                    result.currentPrice = parsedPrice;
                }
            }

            if (!result.symbol || result.symbol === 'N/A') {
                result.symbol = sym.split(':')[1] || sym;
            }

            // 2. Company Name
            const companyNameEl = document.querySelector('.chart-legend [class*="title-"], [class*="legend-"] [class*="title-"]');
            if (companyNameEl) {
                result.companyName = companyNameEl.innerText.trim();
            }

            // 3. Robust OHLC Validation
            const legendContainer = document.querySelector('.chart-legend') || document.querySelector('[class*="legend-"]');
            if (legendContainer) {
                const allItems = Array.from(legendContainer.querySelectorAll('[class*="valueTitle-"], [class*="valueValue-"]'));
                
                let currentLabel = null;
                for (let el of allItems) {
                    if (el.className.includes('valueTitle')) {
                        currentLabel = el.innerText.trim().toUpperCase();
                    } else if (el.className.includes('valueValue') && currentLabel) {
                        const val = parseFloat(el.innerText.replace(/,/g, '').replace(/[^\d.-]/g, ''));
                        if (!isNaN(val)) {
                            if (currentLabel === 'O') result.open = val;
                            if (currentLabel === 'H') result.high = val;
                            if (currentLabel === 'L') result.low = val;
                            if (currentLabel === 'C') {
                                result.close = val;
                                if (result.currentPrice === null) {
                                    result.currentPrice = val;
                                }
                            }
                        }
                        currentLabel = null;
                    }
                }
            }

            return result;
        }, symbol);

        const requiredFields = ['high', 'low', 'close', 'currentPrice'];
        for (const field of requiredFields) {
            if (extractedData[field] === null || isNaN(extractedData[field])) {
                throw new Error(`Validation failed: ${field} is null or invalid. Extracted JSON: ${JSON.stringify(extractedData)}`);
            }
        }

    } catch (e) {
        status = 'FAILED';
        errorDetails = e.message;
        console.error(`[Run ${runIndex}] Error: ${errorDetails}`);
    } finally {
        await page.screenshot({ path: screenshotPath }); // ALWAYS capture screenshot
        
        const endTime = new Date().toISOString();
        const logEntry = {
            runIndex,
            startTime,
            endTime,
            symbol,
            timeframe,
            status,
            errorDetails,
            screenshotPath,
            data: extractedData
        };

        fs.appendFileSync('collection_log.jsonl', JSON.stringify(logEntry) + '\n');
        await page.close();

        return logEntry;
    }
}

(async () => {
    console.log('Starting SPEC-001 Reliability Validation...');
    const browser = await chromium.launch({ headless: false }); 
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    const SYMBOL = 'EGX:COMI';
    const TIMEFRAME = '1D'; 
    const RUNS = 10;
    let successfulRuns = 0;

    for (let i = 1; i <= RUNS; i++) {
        console.log(`\n--- Initiating Run ${i}/${RUNS} ---`);
        const result = await extractData(context, SYMBOL, TIMEFRAME, i);
        
        if (result.status === 'SUCCESS') {
            successfulRuns++;
            console.log(`[Run ${i}] Success! Extracted Data:`);
            console.log(JSON.stringify(result.data, null, 2));
        } else {
            console.log(`[Run ${i}] Failed!`);
        }
        
        if (i < RUNS) await new Promise(r => setTimeout(r, 2000));
    }

    const successRate = (successfulRuns / RUNS) * 100;
    console.log('\n========================================');
    console.log(`Reliability Validation Complete`);
    console.log(`Total Runs:    ${RUNS}`);
    console.log(`Success Rate:  ${successRate}%`);
    console.log(`Target:        >= 95%`);
    
    if (successRate >= 95) {
        console.log(`✅ Reliability criteria MET.`);
    } else {
        console.log(`❌ Reliability criteria FAILED.`);
    }
    console.log('========================================');

    await browser.close();
})();
