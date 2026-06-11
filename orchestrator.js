const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// --- Configuration & Constants ---
const CONFIG = {
    CHUNKS: { SIZE: 25, DELAY: 5000 },
    WORKERS: { CONCURRENCY: 3, DELAY_MIN: 2000, DELAY_MAX: 5000 },
    RETRY: { MAX_ATTEMPTS: 3, DELAYS: [0, 2000, 5000] }, // Index 0 is attempt 1 (0ms), Index 1 is attempt 2 (2000ms), etc.
    CIRCUIT_BREAKER: { THRESHOLD: 0.20, PAUSE: 60000 }
};

const LOG_FILE = path.join(__dirname, 'logs', 'orchestrator_log.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'data', 'output.jsonl');
const CHECKPOINT_FILE = path.join(__dirname, 'state', 'checkpoint.json');
const SYMBOLS_FILE = path.join(__dirname, 'config', 'symbols.json');

// --- Utilities ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomJitter = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));
const logToFile = (data) => fs.appendFileSync(LOG_FILE, JSON.stringify(data) + '\n');
const appendOutputJsonl = (data) => fs.appendFileSync(OUTPUT_FILE, JSON.stringify(data) + '\n');

// Atomic Checkpoint Write
function saveCheckpoint(symbol) {
    const tempFile = `${CHECKPOINT_FILE}.tmp`;
    let checkpoint = [];
    if (fs.existsSync(CHECKPOINT_FILE)) {
        try {
            checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
        } catch (e) {
            console.error('[ERROR] Failed to parse checkpoint file. Creating new one.', e);
        }
    }
    if (!checkpoint.includes(symbol)) checkpoint.push(symbol);
    fs.writeFileSync(tempFile, JSON.stringify(checkpoint));
    fs.renameSync(tempFile, CHECKPOINT_FILE);
}

function loadCheckpoint() {
    let checkpoint = [];
    if (fs.existsSync(CHECKPOINT_FILE)) {
        try {
            checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
        } catch (e) {
            console.warn('[WARNING] Failed to parse checkpoint. Starting fresh.', e);
        }
    }
    
    return checkpoint;
}

// --- Parsing CLI Arguments ---
const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'phase3';

let IS_HEADLESS = true;
let MAX_SYMBOLS = 250;

if (modeArg === 'phase1') {
    IS_HEADLESS = false;
    MAX_SYMBOLS = 10;
    console.log(`[MODE] Phase 1: Debugging (Headed, ${MAX_SYMBOLS} symbols)`);
} else if (modeArg === 'phase2') {
    IS_HEADLESS = true;
    MAX_SYMBOLS = 50;
    console.log(`[MODE] Phase 2: Staging (Headless, ${MAX_SYMBOLS} symbols)`);
} else {
    IS_HEADLESS = true;
    MAX_SYMBOLS = 250;
    console.log(`[MODE] Phase 3: Production (Headless, 250+ symbols)`);
}

// --- Data Normalization & Validation ---
function validateAndNormalize(data) {
    if (!data.symbol || !data.name) throw new Error('Missing basic symbol info');
    
    // Parse to floats
    const o = parseFloat(data.open);
    const h = parseFloat(data.high);
    const l = parseFloat(data.low);
    const c = parseFloat(data.close);
    const price = parseFloat(data.currentPrice);

    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || isNaN(price)) {
        throw new Error('NaN detected in extracted values');
    }

    if (h < l) throw new Error('INVALID: High is less than Low');
    if (c > h) console.warn(`[WARN] ${data.symbol}: Close (${c}) > High (${h})`);
    if (c < l) console.warn(`[WARN] ${data.symbol}: Close (${c}) < Low (${l})`);

    return {
        symbol: data.symbol,
        name: data.name,
        open: o,
        high: h,
        low: l,
        close: c,
        currentPrice: price,
        timestamp: new Date().toISOString(),
        status: "SUCCESS"
    };
}

// --- Core Scraper Logic ---
async function scrapeSymbol(browser, symbol) {
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Performance Optimization: Block heavy assets
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    try {
        const url = `https://www.tradingview.com/chart/?symbol=EGX%3A${symbol}&interval=1D`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        await page.waitForSelector('[class*="legend-"]', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000); // Wait for data to stabilize

        // Label-Based DOM Extraction
        const rawData = await page.evaluate(() => {
            const legendContainer = document.querySelector('.chart-legend') || document.querySelector('[class*="legend-"]');
            if (!legendContainer) return null;

            const items = Array.from(legendContainer.querySelectorAll('[class*="valueTitle-"], [class*="valueValue-"]'));
            let currentLabel = '';
            const values = {};

            for (const item of items) {
                if (item.className.includes('valueTitle')) {
                    currentLabel = item.textContent.trim();
                } else if (item.className.includes('valueValue') && currentLabel) {
                    values[currentLabel] = item.textContent.trim().replace(/,/g, '');
                    currentLabel = '';
                }
            }

            let currentPrice = null;
            const title = document.title;
            const priceMatch = title.match(/^([A-Z]+)\s+([\d.]+)/);
            if (priceMatch) {
                currentPrice = priceMatch[2];
            } else if (values['C']) {
                currentPrice = values['C']; // Fallback
            }

            return {
                open: values['O'] || null,
                high: values['H'] || null,
                low: values['L'] || null,
                close: values['C'] || null,
                currentPrice: currentPrice || null
            };
        });

        if (!rawData || !rawData.close) {
            throw new Error('Data extraction failed (DOM structure missing or changed)');
        }

        // Fetch company name from header
        let companyName = "Unknown";
        try {
            const nameEl = await page.$('[class*="js-symbol-description"]');
            if (nameEl) {
                companyName = await nameEl.innerText();
            }
        } catch (e) { /* ignore */ }

        return { symbol, name: companyName, ...rawData };

    } finally {
        await page.close();
        await context.close();
    }
}

// --- Worker & Retry Orchestration ---
async function processSymbolWithRetry(browser, symbol) {
    const startTime = Date.now();
    let attempt = 0;
    let lastError = "";

    while (attempt < CONFIG.RETRY.MAX_ATTEMPTS) {
        if (attempt > 0) {
            console.log(`[RETRY] Symbol ${symbol} - Attempt ${attempt + 1}/${CONFIG.RETRY.MAX_ATTEMPTS}`);
            await sleep(CONFIG.RETRY.DELAYS[attempt]);
        }

        try {
            // Apply external pacing (Rate Limiting Delay)
            await randomJitter(CONFIG.WORKERS.DELAY_MIN, CONFIG.WORKERS.DELAY_MAX);

            const rawData = await scrapeSymbol(browser, symbol);
            const cleanData = validateAndNormalize(rawData);
            
            const durationMs = Date.now() - startTime;
            logToFile({ symbol, status: "SUCCESS", retries: attempt, durationMs });
            saveCheckpoint(symbol); // Atomic save
            return { cleanData, retries: attempt, durationMs };

        } catch (error) {
            lastError = error.message;
            attempt++;
        }
    }

    const durationMs = Date.now() - startTime;
    logToFile({ symbol, status: "FAILED", retries: attempt, durationMs, errorMessage: lastError });
    console.error(`[FAILED] Symbol ${symbol} exhausted retries. Error: ${lastError}`);
    return null;
}

// --- Async Queue Manager ---
async function runWorkerQueue(browser, symbols, currentConcurrency) {
    const results = [];
    const metrics = { failedCount: 0, totalDuration: 0, retryDist: { 0: 0, 1: 0, 2: 0 } };
    const queue = [...symbols];
    
    // Worker function
    const worker = async () => {
        while (queue.length > 0) {
            const symbol = queue.shift();
            console.log(`[WORKER] Starting ${symbol}...`);
            const result = await processSymbolWithRetry(browser, symbol);
            if (result) {
                results.push(result.cleanData);
                appendOutputJsonl(result.cleanData); // JSONL Appending
                metrics.totalDuration += result.durationMs;
                metrics.retryDist[result.retries]++;
            } else {
                metrics.failedCount++;
            }
        }
    };

    // Spawn workers
    const workers = [];
    const actualConcurrency = Math.min(currentConcurrency, symbols.length);
    for (let i = 0; i < actualConcurrency; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
    return { results, metrics };
}

// --- Main Orchestrator ---
(async () => {
    console.log('--- EGX Orchestrator Started ---');
    // Ensure output and log exist if not resuming
    const checkpointedSymbols = loadCheckpoint();
    if (checkpointedSymbols.length === 0) {
        if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);
        if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
    } else {
        console.log(`[RESUME] Found checkpoint. Resuming, skipping ${checkpointedSymbols.length} already processed symbols.`);
    }

    // Load symbols
    let symbolsList = [];
    try {
        symbolsList = JSON.parse(fs.readFileSync(SYMBOLS_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to load symbols file from config/');
        process.exit(1);
    }

    // Filter out processed and slice by MAX
    symbolsList = symbolsList.slice(0, MAX_SYMBOLS).filter(sym => !checkpointedSymbols.includes(sym));
    console.log(`Total symbols remaining to process: ${symbolsList.length}`);

    // Chunking
    let activeConcurrency = CONFIG.WORKERS.CONCURRENCY;

    for (let i = 0; i < symbolsList.length; i += CONFIG.CHUNKS.SIZE) {
        // Memory Check!
        const memUsageMB = process.memoryUsage().rss / 1024 / 1024;
        if (memUsageMB > 1500) {
            console.error(`[CRITICAL] Memory exceeded 1.5GB (${memUsageMB.toFixed(2)} MB). Exiting to prevent crash. System will resume from checkpoint on restart.`);
            process.exit(1);
        }

        const chunkSymbols = symbolsList.slice(i, i + CONFIG.CHUNKS.SIZE);
        console.log(`\n=== Processing Chunk ${Math.floor(i / CONFIG.CHUNKS.SIZE) + 1} (${chunkSymbols.length} symbols, Concurrency: ${activeConcurrency}) ===`);

        // Spawn Fresh Browser for the chunk
        const browser = await chromium.launch({ headless: IS_HEADLESS });
        const chunkStartTime = Date.now();
        
        try {
            const { results, metrics } = await runWorkerQueue(browser, chunkSymbols, activeConcurrency);
            
            // Print Observability Metrics
            const chunkTime = (Date.now() - chunkStartTime) / 1000;
            const avgTime = results.length ? (metrics.totalDuration / results.length / 1000).toFixed(2) : 0;
            const failureRate = metrics.failedCount / chunkSymbols.length;
            const finalMemUsage = process.memoryUsage().rss / 1024 / 1024;

            console.log(`\n--- Batch Metrics ---`);
            console.log(`Batch Duration: ${chunkTime.toFixed(1)}s`);
            console.log(`Avg Scrape Time/Symbol: ${avgTime}s`);
            console.log(`Failure Rate: ${(failureRate * 100).toFixed(1)}%`);
            console.log(`Retry Dist: 0:${metrics.retryDist[0]} | 1:${metrics.retryDist[1]} | 2:${metrics.retryDist[2]}`);
            console.log(`Memory Usage: ${finalMemUsage.toFixed(2)} MB`);
            console.log(`---------------------`);

            // Circuit Breaker Evaluation
            if (failureRate > CONFIG.CIRCUIT_BREAKER.THRESHOLD) {
                console.error(`\n[CIRCUIT BREAKER TRIGGERED] Failure rate ${Math.round(failureRate*100)}% > ${CONFIG.CIRCUIT_BREAKER.THRESHOLD*100}%.`);
                console.log(`Pausing system for ${CONFIG.CIRCUIT_BREAKER.PAUSE / 1000} seconds...`);
                await sleep(CONFIG.CIRCUIT_BREAKER.PAUSE);
                
                // Adaptive Tuning: Drop concurrency
                activeConcurrency = Math.max(2, activeConcurrency - 1);
                console.log(`[ADAPTIVE TUNING] Dropped concurrency to ${activeConcurrency} to reduce load.`);
            }
            
        } finally {
            console.log(`[CHUNK COMPLETE] Destroying browser instance...`);
            await browser.close();
        }

        // Delay between chunks
        if (i + CONFIG.CHUNKS.SIZE < symbolsList.length) {
            console.log(`Waiting ${CONFIG.CHUNKS.DELAY / 1000} seconds before next chunk...`);
            await sleep(CONFIG.CHUNKS.DELAY);
        }
    }

    console.log(`\n--- Run Complete ---`);
    console.log(`Output saved sequentially to ${OUTPUT_FILE}`);
    console.log(`Logs saved to ${LOG_FILE}`);

})();
