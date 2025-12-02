const DatabaseService = require('./services/databaseService');
const db = new DatabaseService();

setTimeout(async () => {
    try {
        const chatbots = await db.getAllChatbots();
        console.log('Chatbots:', JSON.stringify(chatbots, null, 2));
    } catch (err) {
        console.error(err);
    }
}, 1000);
