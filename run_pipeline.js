const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { syncToGoogleSheets } = require('./google_sheets_sync');
const { sendTelegramAlert } = require('./telegram_notifier');

const PIPELINE_STATE_FILE = path.join(__dirname, 'state', 'pipeline_state.json');
const LOCK_FILE = path.join(__dirname, 'state', 'pipeline.lock');
const LOG_FILE = path.join(__dirname, 'logs', 'pipeline_log.jsonl');

const STAGES = [
    { id: 'orchestrator', file: 'orchestrator.js', expectedOutput: 'data/output.jsonl' },
    { id: 'pivot', file: 'pivot_engine.js', expectedOutput: 'data/levels.jsonl' },
    { id: 'intelligence', file: 'intelligence_engine.js', expectedOutput: 'data/intelligence.jsonl' },
    { id: 'time', file: 'time_intelligence_engine.js', expectedOutput: 'data/time_intelligence.jsonl' }
];

function logToFile(data) {
    fs.appendFileSync(LOG_FILE, JSON.stringify(data) + '\n');
}

function loadState() {
    if (fs.existsSync(PIPELINE_STATE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(PIPELINE_STATE_FILE, 'utf8'));
        } catch (e) {
            return null;
        }
    }
    return null;
}

function saveState(state) {
    const tempFile = `${PIPELINE_STATE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
    fs.renameSync(tempFile, PIPELINE_STATE_FILE);
}

function runCommand(file) {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [file], { stdio: 'inherit', cwd: __dirname });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Process ${file} exited with code ${code}`));
        });
    });
}

async function runPipeline() {
    // 1. Check Lock File
    if (fs.existsSync(LOCK_FILE)) {
        console.error("🚫 PIPELINE GUARD: Lock file exists. Another pipeline is currently running.");
        process.exit(1);
    }
    
    // Create Lock
    fs.writeFileSync(LOCK_FILE, new Date().toISOString());

    const args = process.argv.slice(2);
    const modeArg = args.find(a => a.startsWith('--mode=')) || '--mode=full';
    const mode = modeArg.split('=')[1];

    let state = loadState();

    if (mode === 'full') {
        state = {
            runId: crypto.randomBytes(8).toString('hex'),
            status: 'RUNNING',
            currentStage: STAGES[0].id,
            timestamp: new Date().toISOString()
        };
        saveState(state);
    } else if (mode === 'resume') {
        if (!state || state.status === 'COMPLETED') {
            console.error("No failed or running pipeline state found to resume.");
            process.exit(1);
        }
        console.log(`Resuming pipeline from stage: ${state.currentStage}`);
        state.status = 'RUNNING';
        saveState(state);
    }

    let startIdx = STAGES.findIndex(s => s.id === state.currentStage);
    if (startIdx === -1) startIdx = 0;

    for (let i = startIdx; i < STAGES.length; i++) {
        const stage = STAGES[i];
        state.currentStage = stage.id;
        state.timestamp = new Date().toISOString();
        saveState(state);

        console.log(`\n========================================`);
        console.log(`[PIPELINE] Starting Stage: ${stage.id}`);
        console.log(`========================================`);

        const startTime = Date.now();
        
        try {
            await runCommand(stage.file);
            
            // PIPELINE GUARD: Verify Expected Output File
            const outPath = path.join(__dirname, stage.expectedOutput);
            if (!fs.existsSync(outPath)) {
                throw new Error(`PIPELINE GUARD: Output file missing (${stage.expectedOutput})`);
            }
            const stats = fs.statSync(outPath);
            if (stats.size === 0) {
                throw new Error(`PIPELINE GUARD: Output file is empty (${stage.expectedOutput})`);
            }

            const duration = Date.now() - startTime;
            logToFile({
                runId: state.runId,
                stage: stage.id,
                status: 'SUCCESS',
                startTime: new Date(startTime).toISOString(),
                durationMs: duration
            });
            console.log(`[PIPELINE] Stage ${stage.id} completed in ${duration}ms.\n`);
        } catch (err) {
            const duration = Date.now() - startTime;
            logToFile({
                runId: state.runId,
                stage: stage.id,
                status: 'FAILED',
                error: err.message,
                startTime: new Date(startTime).toISOString(),
                durationMs: duration
            });
            console.error(`\n[PIPELINE] Stage ${stage.id} FAILED:`, err.message);
            
            state.status = 'FAILED';
            state.timestamp = new Date().toISOString();
            saveState(state);
            if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
            process.exit(1);
        }
    }

    state.status = 'COMPLETED';
    state.currentStage = 'done';
    state.timestamp = new Date().toISOString();
    saveState(state);
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);

    console.log(`\n========================================`);
    console.log(`[PIPELINE] ALL STAGES COMPLETED SUCCESSFULLY.`);
    console.log(`========================================\n`);

    console.log("========================================");
    console.log("[PIPELINE] Starting Stage: google_sheets_sync");
    console.log("========================================");
    const startSync = Date.now();
    await syncToGoogleSheets();
    console.log(`[PIPELINE] Stage google_sheets_sync completed in ${Date.now() - startSync}ms.\n`);

    console.log("========================================");
    console.log("[PIPELINE] Starting Stage: telegram_alerts");
    console.log("========================================");
    const startTelegram = Date.now();
    await sendTelegramAlert();
    console.log(`[PIPELINE] Stage telegram_alerts completed in ${Date.now() - startTelegram}ms.\n`);

    console.log("========================================");
    console.log("[PIPELINE] FULL AUTOMATION COMPLETE.");
    console.log("========================================");
}

runPipeline().catch(err => {
    console.error("[PIPELINE FATAL ERROR]", err);
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    process.exit(1);
});
