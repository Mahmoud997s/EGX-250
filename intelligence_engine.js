const fs = require('fs');
const readline = require('readline');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'data', 'levels.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'data', 'intelligence.jsonl');
const TEMP_FILE = `${OUTPUT_FILE}.tmp`;

/**
 * Clamp score between 0 and 100
 */
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

/**
 * Calculates Market Bias
 */
function getMarketBias(price, pivot) {
    const distance = Math.abs(price - pivot) / pivot;

    if (distance < 0.006) {
        return "NEUTRAL";
    }

    if (price > pivot) {
        return distance > 0.02 ? "STRONG_BULL" : "WEAK_BULL";
    } else {
        return distance > 0.02 ? "STRONG_BEAR" : "WEAK_BEAR";
    }
}

/**
 * Detects Market Zone
 */
function getZone(price, levels) {
    const isNear = (target) => Math.abs(price - target) / target <= 0.005;

    if (isNear(levels.r1) || isNear(levels.r2) || isNear(levels.r3) || isNear(levels.r4)) {
        return "RESISTANCE_ZONE";
    }
    
    if (isNear(levels.s1) || isNear(levels.s2) || isNear(levels.s3) || isNear(levels.s4)) {
        return "SUPPORT_ZONE";
    }

    if (isNear(levels.pivot)) {
        return "PIVOT_ZONE";
    }

    return "MID_ZONE";
}

/**
 * Generates Trading Signals
 */
function getSignals(price, high, low, levels) {
    const signals = [];

    // Breakout / Breakdown
    if (price > levels.r1) signals.push("BREAKOUT_R1");
    if (price < levels.s1) signals.push("BREAKDOWN_S1");

    // Rejection / Bounce
    const rejection = (high >= levels.r1 && price < levels.r1);
    const bounce = (low <= levels.s1 && price > levels.s1);

    if (rejection) signals.push("REJECTION_R1");
    if (bounce) signals.push("SUPPORT_BOUNCE_S1");

    // Range Market
    if (price <= levels.r1 && price >= levels.s1 && !rejection && !bounce && signals.length === 0) {
        signals.push("RANGE_MARKET");
    }

    // Approach markers
    const isNear = (target) => Math.abs(price - target) / target <= 0.005;
    if (price < levels.r1 && isNear(levels.r1) && !rejection) signals.push("APPROACHING_R1");
    if (price > levels.s1 && isNear(levels.s1) && !bounce) signals.push("APPROACHING_S1");

    return signals;
}

/**
 * Calculates Strength Score (0 -> 100)
 */
function getStrengthScore(price, high, low, open, levels) {
    let score = 50; // Base score

    // Bullish factors
    if (price > levels.pivot) score += 20;
    if (price > levels.r1) score += 10;
    if (price > levels.r2) score += 10;

    // Bearish factors
    if (price < levels.pivot) score -= 20;
    if (price < levels.s1) score -= 10;
    if (price < levels.s2) score -= 10;

    // Volatility adjustment
    const volatility = (high - low) / open;
    if (volatility < 0.04) {
        score += 10; // Stable
    } else if (volatility > 0.08) {
        score -= 10; // Erratic
    }

    return clamp(score, 0, 100);
}

/**
 * Generates human readable notes based on findings
 */
function generateNotes(bias, zone, signals) {
    let notes = [];

    if (bias.includes("BULL")) notes.push("Holding above Pivot.");
    else if (bias.includes("BEAR")) notes.push("Trading below Pivot.");
    else notes.push("Hovering at Pivot.");

    if (zone === "RESISTANCE_ZONE") notes.push("Testing Resistance.");
    if (zone === "SUPPORT_ZONE") notes.push("Testing Support.");

    if (signals.includes("REJECTION_R1")) notes.push("Hit R1 and faced selling pressure.");
    if (signals.includes("SUPPORT_BOUNCE_S1")) notes.push("Tested S1 and found buyers.");

    return notes.join(" ");
}

async function runIntelligenceEngine() {
    console.log("--- EGX Market Intelligence Engine Started ---");
    console.log(`Reading from: ${INPUT_FILE}`);
    console.log(`Writing to: ${OUTPUT_FILE}`);

    if (fs.existsSync(TEMP_FILE)) {
        fs.unlinkSync(TEMP_FILE);
    }

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;

        try {
            const record = JSON.parse(line);
            
            // Primary: Close, Optional: CurrentPrice
            // Since our scraper outputs both, we prefer currentPrice if available
            const price = record.baseData.currentPrice || record.baseData.close;
            const { high, low, open } = record.baseData;
            const levels = record.levels;

            const bias = getMarketBias(price, levels.pivot);
            const zone = getZone(price, levels);
            const signals = getSignals(price, high, low, levels);
            const strengthScore = getStrengthScore(price, high, low, open, levels);
            const notes = generateNotes(bias, zone, signals);

            const intelligenceRecord = {
                symbol: record.symbol,
                name: record.name,
                timestamp: record.timestamp,
                intelligence: {
                    priceUsed: price,
                    bias: bias,
                    zone: zone,
                    signals: signals,
                    strengthScore: strengthScore,
                    notes: notes
                },
                baseData: record.baseData,
                levels: record.levels
            };

            fs.appendFileSync(TEMP_FILE, JSON.stringify(intelligenceRecord) + '\n');
            count++;

        } catch (err) {
            console.error(`[ERROR] Failed to process line: ${line}`, err);
        }
    }

    console.log("\n--- Engine Summary ---");
    console.log(`Analyzed & Scored: ${count} symbols`);
    console.log("----------------------");
    
    // Atomic Rename
    if (count > 0) {
        fs.renameSync(TEMP_FILE, OUTPUT_FILE);
    }

    console.log("Market Intelligence Engine run complete!");
}

if (require.main === module) {
    runIntelligenceEngine().catch(console.error);
}

module.exports = {
    clamp,
    getMarketBias,
    getZone,
    getSignals,
    getStrengthScore
};
