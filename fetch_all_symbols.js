const fs = require('fs');

async function fetchAllEGX() {
    try {
        const response = await fetch('https://scanner.tradingview.com/egypt/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "filter": [{"left": "exchange", "operation": "equal", "right": "EGX"}],
                "options": { "lang": "en" },
                "markets": ["egypt"],
                "symbols": { "query": { "types": [] }, "tickers": [] },
                "columns": ["name", "description"]
            })
        });

        const data = await response.json();
        const symbols = data.data.map(item => item.d[0]); // item.d[0] is the symbol
        console.log(`Found ${symbols.length} EGX symbols!`);
        
        fs.writeFileSync('config/symbols.json', JSON.stringify(symbols, null, 2));
        console.log("Updated config/symbols.json");
    } catch (err) {
        console.error("Failed to fetch symbols:", err.message);
    }
}

fetchAllEGX();
