const fs = require('fs');
const path = require('path');

const TRANSLATIONS_FILE = path.join(__dirname, 'config', 'translations.json');

async function fetchArabicNames() {
    console.log("Fetching Arabic names from TradingView...");
    try {
        const response = await fetch('https://scanner.tradingview.com/egypt/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "filter": [{"left": "exchange", "operation": "equal", "right": "EGX"}],
                "options": { "lang": "ar" },
                "markets": ["egypt"],
                "symbols": { "query": { "types": [] }, "tickers": [] },
                "columns": ["name", "description"]
            })
        });

        const data = await response.json();
        
        let translations = { bias: {}, regime: {}, names: {} };
        if (fs.existsSync(TRANSLATIONS_FILE)) {
            translations = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, 'utf8'));
        }

        let updatedCount = 0;
        data.data.forEach(item => {
            const symbol = item.d[0];
            const name = item.d[1];
            
            // Only update if it's not already manually set in our translations, 
            // or if it's currently missing. We trust our manual Arabic translations more.
            // Actually, let's just populate the missing ones!
            if (!translations.names[symbol] || translations.names[symbol] === symbol) {
                translations.names[symbol] = name;
                updatedCount++;
            }
        });

        fs.writeFileSync(TRANSLATIONS_FILE, JSON.stringify(translations, null, 4), 'utf8');
        console.log(`Successfully added/updated ${updatedCount} Arabic names in translations.json!`);

    } catch (err) {
        console.error("Failed to fetch symbols:", err.message);
    }
}

fetchArabicNames();
