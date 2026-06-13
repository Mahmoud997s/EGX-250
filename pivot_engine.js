const fs = require('fs');
const readline = require('readline');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'data', 'output.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'data', 'levels.jsonl');
const TEMP_FILE = `${OUTPUT_FILE}.tmp`;

/**
 * Precision hybrid: formats a number to 4 decimal places for storage.
 * Keeps it as a number, not a string.
 */
function storeFormat(num) {
    if (isNaN(num)) return null;
    return Number(Math.round(num + 'e4') + 'e-4');
}

/**
 * Computes Classic Pivot Points
 */
function computePivotLevels(high, low, close) {
    // Rule 1: Internal calculations use full float precision
    const p = (high + low + close) / 3;
    
    const r1 = (p * 2) - low;
    const s1 = (p * 2) - high;
    
    const r2 = p + (r1 - s1);
    const s2 = p - (r1 - s1);
    
    const r3 = p + 2 * (r1 - s1);
    const s3 = p - 2 * (r1 - s1);
    
    const r4 = r3 + (r2 - r1);
    const s4 = s3 - (s1 - s2);

    // Rule 2: Storage layer (4 decimal places)
    return {
        pivot: storeFormat(p),
        r1: storeFormat(r1),
        r2: storeFormat(r2),
        r3: storeFormat(r3),
        r4: storeFormat(r4),
        s1: storeFormat(s1),
        s2: storeFormat(s2),
        s3: storeFormat(s3),
        s4: storeFormat(s4)
    };
}

/**
 * Validates the OHLC integrity
 */
function validateOHLC(data) {
    const { high, low, close, open } = data;
    
    // Check missing values
    if (typeof high !== 'number' || typeof low !== 'number' || typeof close !== 'number' || typeof open !== 'number') {
        return false;
    }

    // Structural rule: High must be the highest, Low must be the lowest
    if (high < low) return false;
    if (close > high || close < low) return false;
    if (open > high || open < low) return false;
    
    return true;
}

async function runPivotEngine() {
    console.log("--- EGX Pivot Engine Started ---");
    console.log(`Reading from: ${INPUT_FILE}`);
    console.log(`Writing to: ${OUTPUT_FILE}`);

    // Clear temp file if it exists
    if (fs.existsSync(TEMP_FILE)) {
        fs.unlinkSync(TEMP_FILE);
    }

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;

        try {
            const record = JSON.parse(line);

            // Skip records that failed completely in extraction phase
            if (record.status !== "SUCCESS" && record.status !== "SUSPICIOUS") {
                skippedCount++;
                continue;
            }

            // Validation Step before calculation
            if (!validateOHLC(record)) {
                console.warn(`[WARNING] Data integrity failed for ${record.symbol}. Skipping.`);
                failedCount++;
                continue;
            }

            // Calculation Step
            const levels = computePivotLevels(record.high, record.low, record.close);

            // Output Object creation
            const outputRecord = {
                symbol: record.symbol,
                name: record.name,
                timestamp: record.timestamp,
                baseData: {
                    open: storeFormat(record.open),
                    high: storeFormat(record.high),
                    low: storeFormat(record.low),
                    close: storeFormat(record.close),
                    currentPrice: storeFormat(record.currentPrice)
                },
                levels: levels
            };

            // Write to temp file
            fs.appendFileSync(TEMP_FILE, JSON.stringify(outputRecord) + '\n');
            processedCount++;

        } catch (err) {
            console.error(`[ERROR] Failed to process line: ${line}`, err);
            failedCount++;
        }
    }

    console.log("\n--- Engine Summary ---");
    console.log(`Processed successfully: ${processedCount}`);
    console.log(`Skipped (Scraper Failures): ${skippedCount}`);
    console.log(`Failed (Validation/Error): ${failedCount}`);
    console.log("----------------------");
    
    // Atomic Rename
    if (processedCount > 0) {
        fs.renameSync(TEMP_FILE, OUTPUT_FILE);
    }

    console.log("Pivot Engine run complete!");
}

if (require.main === module) {
    runPivotEngine().catch(console.error);
}

module.exports = {
    storeFormat,
    computePivotLevels
};
