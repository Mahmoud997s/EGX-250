const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = '1t1VhMs3T8_cI0d_ogcDvOw3uLHYei-rJeY0ukc0zex0';
const SHEET_NAME = 'اليومي'; // RTL Daily Sheet
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Paths to our local data files
const LEVELS_FILE = path.join(__dirname, 'data', 'levels.jsonl');
const TIME_INTEL_FILE = path.join(__dirname, 'data', 'time_intelligence.jsonl');

// Load Translations
const TRANSLATIONS_FILE = path.join(__dirname, 'config', 'translations.json');
let TRANSLATIONS = { bias: {}, regime: {}, names: {} };
if (fs.existsSync(TRANSLATIONS_FILE)) {
    try {
        TRANSLATIONS = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, 'utf8'));
    } catch (e) {
        console.error("Failed to parse translations.json:", e);
    }
}

async function syncToGoogleSheets() {
    console.log("--- EGX Google Sheets Sync Engine Started ---");

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error(`[ERROR] credentials.json not found at ${CREDENTIALS_PATH}`);
        console.error("Please ensure you placed the Google Cloud Service Account key in the project directory.");
        process.exit(1);
    }

    if (!fs.existsSync(LEVELS_FILE) || !fs.existsSync(TIME_INTEL_FILE)) {
        console.error(`[ERROR] Data files missing. Please run the pipeline first.`);
        process.exit(1);
    }

    // 1. Read and parse levels.jsonl
    const levelsData = {};
    const levelsLines = fs.readFileSync(LEVELS_FILE, 'utf8').trim().split('\n');
    for (const line of levelsLines) {
        if (!line) continue;
        const record = JSON.parse(line);
        levelsData[record.symbol] = record;
    }

    // 2. Read and parse time_intelligence.jsonl
    const intelData = {};
    const intelLines = fs.readFileSync(TIME_INTEL_FILE, 'utf8').trim().split('\n');
    for (const line of intelLines) {
        if (!line) continue;
        const record = JSON.parse(line);
        intelData[record.symbol] = record;
    }

    // 3. Transform & Join data into Google Sheets Row format
    // Row Format: Date | Symbol | Pivot | R1 | R2 | S1 | S2 | Bias | Score | Regime
    const rowsToAppend = [];
    
    // Use the exact date format
    const todayStr = new Date().toISOString().split('T')[0];

    for (const symbol in intelData) {
        const intel = intelData[symbol];
        const level = levelsData[symbol];

        if (!level || !intel) continue;

        // Fallbacks for safety
        const pivot = level.levels?.pivot ? level.levels.pivot.toFixed(2) : '-';
        const r1 = level.levels?.r1 ? level.levels.r1.toFixed(2) : '-';
        const r2 = level.levels?.r2 ? level.levels.r2.toFixed(2) : '-';
        const s1 = level.levels?.s1 ? level.levels.s1.toFixed(2) : '-';
        const s2 = level.levels?.s2 ? level.levels.s2.toFixed(2) : '-';
        
        const openPrice = level.baseData?.open || '-';
        const highPrice = level.baseData?.high || '-';
        const lowPrice = level.baseData?.low || '-';
        const closePrice = level.baseData?.close || '-';
        
        const rawBias = intel.daily?.bias || 'UNKNOWN';
        const rawRegime = intel.timeIntelligence?.marketRegime || 'UNKNOWN';

        const bias = TRANSLATIONS.bias[rawBias] || rawBias;
        const score = intel.daily?.score || 0;
        const regime = TRANSLATIONS.regime[rawRegime] || rawRegime;
        const companyName = TRANSLATIONS.names[symbol] || symbol;

        rowsToAppend.push([
            todayStr,
            companyName,
            symbol,
            closePrice,
            openPrice,
            highPrice,
            lowPrice,
            pivot,
            r1,
            r2,
            s1,
            s2,
            bias,
            score,
            regime
        ]);
    }

    if (rowsToAppend.length === 0) {
        console.log("No valid data rows to append.");
        return;
    }

    // 4. Authenticate with Google
    console.log(`[AUTH] Authenticating with Google Service Account...`);
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 5. Append to Sheet
    console.log(`[SYNC] Appending ${rowsToAppend.length} rows to sheet: ${SHEET_NAME}...`);
    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:O`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rowsToAppend
            }
        });

        console.log(`[SUCCESS] Google Sheets Sync Complete!`);
        console.log(`Rows appended: ${response.data.updates?.updatedRows || rowsToAppend.length}`);
    } catch (error) {
        console.error(`[ERROR] Failed to append to Google Sheets:`, error.message);
        process.exit(1);
    }
}

// Execute standalone if called directly
if (require.main === module) {
    syncToGoogleSheets().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { syncToGoogleSheets };
