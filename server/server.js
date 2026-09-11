// Load environment variables (Make sure you have a .env file in your root folder)
require('dotenv').config();

const app = require('./app');

// Fallback to port 3000 if not defined in your .env or config
const PORT = process.env.PORT || 3000;

// IGNITION: START THE SERVER
app.listen(PORT, () => {
    console.log(`🚀 ASB-Pay Backend Initialized`);
    console.log(`📡 Server Status:   ONLINE`);
    console.log(`🌐 API Gateway:     http://localhost:${PORT}/api`);
    console.log(`💳 x402 Protocol:   ACTIVE (Algorand Testnet)`);
    console.log(`🧠 Trust Engine:    CONNECTED (PyTeal Contract)`);
    console.log(`🪙 USDC Asset ID:   10458941`);
    console.log(`[System] Waiting for AI Agent tasks...\n`);
});