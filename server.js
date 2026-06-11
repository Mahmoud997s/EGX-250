const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

const STATE_FILE = path.join(__dirname, 'state', 'pipeline_state.json');
const RESULTS_FILE = path.join(__dirname, 'data', 'time_intelligence.jsonl');

// GET /api/status - Check if pipeline is running
app.get('/api/status', (req, res) => {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            return res.json({ state: 'UNKNOWN', message: 'No state file found' });
        }
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/run - Trigger the pipeline execution
app.post('/api/run', (req, res) => {
    const mode = req.body?.mode || 'full';
    
    // We run it as a child process. In a real server we wouldn't await it synchronously
    // without returning a 202 Accepted, but for TestSprite simplicity, we can await it or return immediately.
    // Let's run it and wait for it.
    exec(`node run_pipeline.js --mode=${mode}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
                stderr
            });
        }
        res.json({
            success: true,
            message: 'Pipeline completed successfully',
            stdout
        });
    });
});

// GET /api/results - Fetch the final intelligence output
app.get('/api/results', (req, res) => {
    try {
        if (!fs.existsSync(RESULTS_FILE)) {
            return res.status(404).json({ error: 'Results file not found. Run pipeline first.' });
        }
        
        // Parse JSONL to JSON Array
        const fileContent = fs.readFileSync(RESULTS_FILE, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        const data = lines.map(line => JSON.parse(line));
        
        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 EGX Pipeline API Server running on http://localhost:${PORT}`);
    console.log(`Endpoints available:`);
    console.log(`- GET  /api/status`);
    console.log(`- POST /api/run`);
    console.log(`- GET  /api/results`);
});
