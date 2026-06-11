const TOKEN = '8513125445:AAEBAAa88NJSGhw5l1Fz4bWvB7rrMXQn4K4';

async function getChatId() {
    console.log("Checking for recent messages to your bot...");
    try {
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
        const data = await response.json();
        
        if (!data.ok) {
            console.error("Failed to get updates:", data);
            return;
        }

        if (data.result.length === 0) {
            console.log("No messages found! Please go to Telegram, open your bot @EGX250bot, and send any message like 'Hello', then run this again.");
            return;
        }

        // Get the latest message
        const latestUpdate = data.result[data.result.length - 1];
        const chatId = latestUpdate.message.chat.id;
        const firstName = latestUpdate.message.chat.first_name || "User";

        console.log(`\n✅ Found your Chat ID!`);
        console.log(`Name: ${firstName}`);
        console.log(`Chat ID: ${chatId}\n`);
        
        console.log(`Save this Chat ID, we will use it in the notifier script!`);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

getChatId();
