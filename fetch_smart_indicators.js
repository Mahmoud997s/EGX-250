const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const OUT_FILE = path.join(DATA_DIR, 'smart_indicators.jsonl');

function getConsensus(rec) {
    if (rec === null || rec === undefined) return "غير متوفر";
    if (rec >= 0.5) return "إجماع قوي بالشراء 🚀";
    if (rec > 0.1) return "إشارة شراء 🟢";
    if (rec <= -0.5) return "إجماع قوي بالبيع 🩸";
    if (rec < -0.1) return "إشارة بيع 🔴";
    return "موقف محايد ➖";
}

function getWhaleRadar(rvol) {
    if (rvol === null || rvol === undefined) return "غير متوفر";
    if (rvol > 2.5) return "سيولة استثنائية (دخول محافظ كبرى) 🐋";
    if (rvol > 1.5) return "سيولة أعلى من المتوسط 📈";
    return "سيولة طبيعية";
}

function getBottomCatcher(rsi) {
    if (rsi === null || rsi === undefined) return "غير متوفر";
    if (rsi < 30) return "مناطق تشبع بيعي (فرصة ارتداد قريبة) 🪝";
    if (rsi > 70) return "مناطق تشبع شرائي (احتمال جني أرباح) 🎈";
    return "آمن (تحرك طبيعي)";
}

function getGoldenCross(sma50, sma200) {
    if (!sma50 || !sma200) return "غير متوفر";
    if (sma50 > sma200) return "تقاطع ذهبي (اتجاه صاعد طويل الأجل) 👑";
    if (sma50 < sma200) return "تقاطع سلبي (اتجاه هابط رئيسي) 💀";
    return "لا يوجد إشارة واضحة";
}

function getSqueeze(bbLower, bbUpper, close) {
    if (!bbLower || !bbUpper || !close) return "غير متوفر";
    const width = (bbUpper - bbLower) / close;
    // 5% width is considered a tight squeeze
    if (width < 0.05) return "تجميع وانكماش يسبق حركة عنيفة وشيكة 💥";
    return "تذبذب طبيعي";
}

async function fetchSmartIndicators() {
    console.log("--- Smart Indicators Engine Started ---");
    try {
        const response = await fetch('https://scanner.tradingview.com/egypt/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "filter": [{"left": "exchange", "operation": "equal", "right": "EGX"}],
                "options": { "lang": "en" },
                "markets": ["egypt"],
                "symbols": { "query": { "types": [] }, "tickers": [] },
                "columns": [
                    "name", 
                    "close", 
                    "Recommend.All", 
                    "relative_volume_10d_calc", 
                    "RSI", 
                    "SMA50", 
                    "SMA200", 
                    "BB.lower", 
                    "BB.upper"
                ]
            })
        });

        const data = await response.json();
        const records = [];

        data.data.forEach(item => {
            const symbol = item.d[0];
            const close = item.d[1];
            const recAll = item.d[2];
            const rvol = item.d[3];
            const rsi = item.d[4];
            const sma50 = item.d[5];
            const sma200 = item.d[6];
            const bbLower = item.d[7];
            const bbUpper = item.d[8];

            const record = {
                symbol: symbol,
                consensus: getConsensus(recAll),
                whaleRadar: getWhaleRadar(rvol),
                bottomCatcher: getBottomCatcher(rsi),
                goldenCross: getGoldenCross(sma50, sma200),
                squeeze: getSqueeze(bbLower, bbUpper, close),
                
                // Keep raw data for Telegram filtering
                raw: { rvol, rsi, recAll }
            };

            records.push(record);
        });

        const jsonlStr = records.map(r => JSON.stringify(r)).join('\n');
        fs.writeFileSync(OUT_FILE, jsonlStr, 'utf8');
        
        console.log(`[SUCCESS] Smart indicators extracted and saved for ${records.length} companies.`);

    } catch (err) {
        console.error("[ERROR] Failed to fetch smart indicators:", err.message);
    }
}

if (require.main === module) {
    fetchSmartIndicators();
}

module.exports = { fetchSmartIndicators };
