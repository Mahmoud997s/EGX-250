const fs = require('fs');
const readline = require('readline');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'data', 'history.jsonl');
const INPUT_FILE = path.join(__dirname, 'data', 'intelligence.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'data', 'time_intelligence.jsonl');

const TEMP_OUTPUT_FILE = `${OUTPUT_FILE}.tmp`;
const TEMP_HISTORY_FILE = `${HISTORY_FILE}.tmp`;

/**
 * Clamp score between 0 and 100
 */
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

/**
 * Check if bias is generally bullish
 */
function isBull(bias) {
    return bias === "WEAK_BULL" || bias === "STRONG_BULL";
}

/**
 * Check if bias is generally bearish
 */
function isBear(bias) {
    return bias === "WEAK_BEAR" || bias === "STRONG_BEAR";
}

/**
 * Read the full history file and build an in-memory map of the last 5 days per symbol
 */
async function loadHistory() {
    const historyMap = new Map();
    
    if (!fs.existsSync(HISTORY_FILE)) {
        return historyMap;
    }

    const fileStream = fs.createReadStream(HISTORY_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const record = JSON.parse(line);
            if (!historyMap.has(record.symbol)) {
                historyMap.set(record.symbol, []);
            }
            historyMap.get(record.symbol).push(record);
        } catch (e) {
            // Ignore bad lines
        }
    }

    // Only keep the last 5 records per symbol to save memory
    for (const [symbol, records] of historyMap.entries()) {
        if (records.length > 5) {
            historyMap.set(symbol, records.slice(-5));
        }
    }

    return historyMap;
}

/**
 * Process a single symbol's time intelligence
 */
function processTimeIntelligence(today, historyRecords) {
    const todayScore = today.intelligence.strengthScore;
    const todayBias = today.intelligence.bias;
    const todaySignals = today.intelligence.signals || [];
    
    // Default Fallbacks for Day 1
    let trend = "STABLE";
    let scoreTrendDirection = "FLAT";
    let biasStability = "UNCONFIRMED_BIAS";
    let signalBehavior = todaySignals.length > 0 ? "BREAKING" : "NONE";

    if (historyRecords.length > 0) {
        // 1. Trend Analysis Engine
        const scores = historyRecords.map(r => r.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const trendDelta = todayScore - avgScore;
        const scoreMax = Math.max(...scores, todayScore);
        const scoreMin = Math.min(...scores, todayScore);

        if (scoreMax - scoreMin > 30) {
            trend = "VOLATILE";
            scoreTrendDirection = "VOLATILE";
        } else if (trendDelta > 10) {
            trend = "IMPROVING";
            scoreTrendDirection = "UPWARD";
        } else if (trendDelta < -10) {
            trend = "DECLINING";
            scoreTrendDirection = "DOWNWARD";
        }

        // 2. Bias Persistence Engine
        // Get the last 2 history days + today to make 3 days
        const recentBiases = historyRecords.slice(-2).map(r => r.bias);
        recentBiases.push(todayBias);

        if (recentBiases.length === 3) {
            if (recentBiases.every(b => isBull(b))) {
                biasStability = "CONFIRMED_BULL";
            } else if (recentBiases.every(b => isBear(b))) {
                biasStability = "CONFIRMED_BEAR";
            } else if (recentBiases.filter(b => b === "NEUTRAL").length >= 2) {
                biasStability = "RANGE_MARKET";
            } else {
                biasStability = "UNSTABLE";
            }
        }

        // 3. Signal Memory Engine
        // Get signals from the last 3 days
        const recentSignalsSet = new Set();
        historyRecords.slice(-3).forEach(r => {
            if (r.signals) r.signals.forEach(s => recentSignalsSet.add(s));
        });

        if (todaySignals.length === 0) {
            if (recentSignalsSet.size > 0) {
                signalBehavior = "FADING";
            }
        } else {
            const hasRecurring = todaySignals.some(s => recentSignalsSet.has(s));
            const hasBreaking = todaySignals.some(s => !recentSignalsSet.has(s));
            
            if (hasRecurring) signalBehavior = "RECURRING";
            else if (hasBreaking) signalBehavior = "BREAKING";
        }
    }

    // 4. Market Regime Detection
    let marketRegime = "TRANSITIONING";

    const hasBreakout = todaySignals.includes("BREAKOUT_R1") || todaySignals.includes("BREAKDOWN_S1");
    const hasRejection = todaySignals.includes("REJECTION_R1");
    const hasBounce = todaySignals.includes("SUPPORT_BOUNCE_S1");

    if (hasBreakout) {
        marketRegime = "BREAKOUT_PHASE";
    } else if (isBull(todayBias) && trend === "IMPROVING") {
        marketRegime = "TRENDING_UP";
    } else if (isBear(todayBias) && trend === "DECLINING") {
        marketRegime = "TRENDING_DOWN";
    } else if (todayBias === "NEUTRAL" && hasBounce) {
        marketRegime = "ACCUMULATION";
    } else if ((todayBias === "NEUTRAL" || isBear(todayBias)) && hasRejection) {
        marketRegime = "DISTRIBUTION";
    } else if (todayBias === "NEUTRAL" && trend === "STABLE") {
        marketRegime = "SIDEWAYS_RANGE";
    }

    // 5. Time-Based Strength Score (TSS)
    let tss = todayScore;
    if (trend === "IMPROVING") tss += 10;
    if (trend === "DECLINING") tss -= 10;
    
    if (biasStability === "CONFIRMED_BULL" || biasStability === "CONFIRMED_BEAR") tss += 5;
    if (biasStability === "UNSTABLE" || trend === "VOLATILE") tss -= 5;

    tss = clamp(tss, 0, 100);

    // Notes Generation
    let notes = `Score is ${trend}.`;
    if (biasStability !== "UNCONFIRMED_BIAS") notes += ` Bias is ${biasStability.replace('_', ' ')}.`;
    notes += ` Market Regime appears to be ${marketRegime}.`;

    return {
        trend,
        scoreTrend: scoreTrendDirection,
        biasStability,
        signalBehavior,
        marketRegime,
        timeStrengthScore: tss,
        notes
    };
}

async function runTimeIntelligence() {
    console.log("--- EGX Time Intelligence Engine Started ---");
    console.log(`Loading History from: ${HISTORY_FILE}`);
    
    const historyMap = await loadHistory();
    console.log(`Loaded history for ${historyMap.size} symbols.`);

    console.log(`Reading Today's Intelligence from: ${INPUT_FILE}`);
    
    if (fs.existsSync(TEMP_OUTPUT_FILE)) {
        fs.unlinkSync(TEMP_OUTPUT_FILE);
    }
    if (fs.existsSync(TEMP_HISTORY_FILE)) {
        fs.unlinkSync(TEMP_HISTORY_FILE);
    }
    
    // Copy existing history to temp history first
    if (fs.existsSync(HISTORY_FILE)) {
        fs.copyFileSync(HISTORY_FILE, TEMP_HISTORY_FILE);
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
            const today = JSON.parse(line);
            const symbol = today.symbol;
            
            const historyRecords = historyMap.get(symbol) || [];
            
            // Process Time Intelligence
            const timeIntelligence = processTimeIntelligence(today, historyRecords);

            // Construct Final Output Record
            const finalRecord = {
                symbol: symbol,
                daily: {
                    score: today.intelligence.strengthScore,
                    bias: today.intelligence.bias
                },
                timeIntelligence: timeIntelligence,
                notes: timeIntelligence.notes
            };

            // Write to output.jsonl
            fs.appendFileSync(TEMP_OUTPUT_FILE, JSON.stringify(finalRecord) + '\n');

            // Construct and append to history.jsonl
            const historyEntry = {
                symbol: symbol,
                date: new Date().toISOString().split('T')[0],
                pivot: today.levels.pivot,
                bias: today.intelligence.bias,
                score: today.intelligence.strengthScore,
                signals: today.intelligence.signals || []
            };
            fs.appendFileSync(TEMP_HISTORY_FILE, JSON.stringify(historyEntry) + '\n');

            count++;

        } catch (err) {
            console.error(`[ERROR] Failed to process line: ${line}`, err);
        }
    }

    console.log("\n--- Engine Summary ---");
    console.log(`Analyzed & Stored History for: ${count} symbols`);
    console.log("----------------------");
    
    // Atomic Rename
    if (count > 0) {
        fs.renameSync(TEMP_OUTPUT_FILE, OUTPUT_FILE);
        fs.renameSync(TEMP_HISTORY_FILE, HISTORY_FILE);
    }

    console.log("Time Intelligence Engine run complete!");
}

if (require.main === module) {
    runTimeIntelligence().catch(console.error);
}

module.exports = {
    isBull,
    isBear,
    processTimeIntelligence
};
