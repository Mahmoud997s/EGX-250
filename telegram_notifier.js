const fs = require('fs');
const path = require('path');

const BOT_TOKEN = '8513125445:AAEBAAa88NJSGhw5l1Fz4bWvB7rrMXQn4K4';
const CHAT_ID = '1964530050'; // Mahmoud's Chat ID

const TIME_INTEL_FILE = path.join(__dirname, 'data', 'time_intelligence.jsonl');
const LEVELS_FILE = path.join(__dirname, 'data', 'levels.jsonl');

async function sendTelegramAlert() {
    if (!CHAT_ID) {
        console.log("[TELEGRAM] Skipping: CHAT_ID not configured.");
        return;
    }
    
    console.log("--- Telegram Notifier Engine Started ---");

    if (!fs.existsSync(TIME_INTEL_FILE)) {
        console.error(`[ERROR] Data file missing: ${TIME_INTEL_FILE}`);
        return;
    }

    // 1. Read data
    const intelLines = fs.readFileSync(TIME_INTEL_FILE, 'utf8').trim().split('\n');
    const levelsLines = fs.readFileSync(LEVELS_FILE, 'utf8').trim().split('\n');
    
    const levelsMap = {};
    for (const line of levelsLines) {
        if (!line) continue;
        const record = JSON.parse(line);
        levelsMap[record.symbol] = record.levels || {};
    }

    const allStocks = [];
    for (const line of intelLines) {
        if (!line) continue;
        const record = JSON.parse(line);
        allStocks.push(record);
    }

    if (allStocks.length === 0) {
        console.log("No stocks to analyze for Telegram.");
        return;
    }

    // 2. Filter and sort
    // Best opportunities (Accumulation + high score)
    const accumulation = allStocks
        .filter(s => s.timeIntelligence?.marketRegime === 'ACCUMULATION')
        .sort((a, b) => (b.daily?.score || 0) - (a.daily?.score || 0))
        .slice(0, 5); // top 5

    // High risk (Distribution + low score)
    const distribution = allStocks
        .filter(s => s.timeIntelligence?.marketRegime === 'DISTRIBUTION')
        .sort((a, b) => (a.daily?.score || 0) - (b.daily?.score || 0)) // lowest first
        .slice(0, 3); // top 3 riskiest

    // 3. Format Message
    const dateStr = new Date().toISOString().split('T')[0];
    const RLM = '\u200F'; // Right-to-Left Mark to force RTL direction in Telegram
    
    let messageText = `${RLM}📊 *التقرير الشامل للبورصة المصرية - ${dateStr}*\n`;
    messageText += `${RLM}════════════════════════\n\n`;

    // Market Overview
    const accCount = allStocks.filter(s => s.timeIntelligence?.marketRegime === 'ACCUMULATION').length;
    const distCount = allStocks.filter(s => s.timeIntelligence?.marketRegime === 'DISTRIBUTION').length;
    
    messageText += `${RLM}📌 *حالة السوق العامة:*\n`;
    messageText += `${RLM}🛒 مناطق الشراء: ${accCount} سهم\n`;
    messageText += `${RLM}💸 مناطق البيع: ${distCount} سهم\n\n`;

    if (accumulation.length > 0) {
        messageText += `${RLM}🟢 *أفضل فرص الشراء (أعلى تقييم):*\n`;
        messageText += `\`\`\`text\n`;
        messageText += `السهم  | التقييم | الارتكاز | دعم 1\n`;
        messageText += `-----------------------------------\n`;
        accumulation.forEach(s => {
            const pivot = levelsMap[s.symbol]?.pivot || '-';
            const s1 = levelsMap[s.symbol]?.s1 || '-';
            const score = String(s.daily?.score || 0).padEnd(5, ' ');
            const sym = s.symbol.padEnd(5, ' ');
            const pvt = String(pivot).padEnd(6, ' ');
            messageText += `${sym}  | ${score}   | ${pvt}   | ${s1}\n`;
        });
        messageText += `\`\`\`\n`;
    }

    if (distribution.length > 0) {
        messageText += `${RLM}🔴 *أسهم في مناطق البيع (للحذر):*\n`;
        messageText += `\`\`\`text\n`;
        messageText += `السهم  | التقييم | الارتكاز | مقاومة 1\n`;
        messageText += `-----------------------------------\n`;
        distribution.forEach(s => {
            const pivot = levelsMap[s.symbol]?.pivot || '-';
            const r1 = levelsMap[s.symbol]?.r1 || '-';
            const score = String(s.daily?.score || 0).padEnd(5, ' ');
            const sym = s.symbol.padEnd(5, ' ');
            const pvt = String(pivot).padEnd(6, ' ');
            messageText += `${sym}  | ${score}   | ${pvt}   | ${r1}\n`;
        });
        messageText += `\`\`\`\n`;
    }
    
    messageText += `${RLM}════════════════════════\n`;
    messageText += `${RLM}🤖 *EGX Baba Automated System*`;

    // 4. Send Request
    console.log(`[TELEGRAM] Sending message to ${CHAT_ID}...`);
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: messageText,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        if (data.ok) {
            console.log(`[SUCCESS] Telegram message sent!`);
        } else {
            console.error(`[ERROR] Telegram API failed:`, data.description);
        }
    } catch (err) {
        console.error(`[ERROR] Network error sending Telegram message:`, err.message);
    }
}

if (require.main === module) {
    sendTelegramAlert().catch(console.error);
}

module.exports = { sendTelegramAlert };
