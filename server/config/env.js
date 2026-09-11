/**
 * TrustChain Environment Configuration
 * This file centralizes all environment variables. By parsing them here, 
 * we avoid sprinkling `process.env` calls throughout the entire codebase 
 * and can easily set default fallback values if a key is missing.
 */

// This line reads your root .env file and loads it into Node
require('dotenv').config();

const env = {
    // "Server config"
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // "Algorand testnet config"
    // If these are missing from .env, it defaults to the free AlgoNode public APIs
    ALGOD_SERVER: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    ALGOD_PORT: process.env.ALGOD_PORT || 443,
    ALGOD_TOKEN: process.env.ALGOD_TOKEN || '',

    // "agent wallet"
    AGENT_WALLET_ADDRESS: process.env.AGENT_WALLET_ADDRESS || '',
    AGENT_WALLET_MNEMONIC: process.env.AGENT_WALLET_MNEMONIC || '',

    // "X402 protocol"
    X402_FACILITATOR_URL: process.env.X402_FACILITATOR_URL || 'https://testnet.x402.org/settle',

    // "ai provider"
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
};

// "Startup snity check"
// This will print a helpful warning in your terminal if you forgot to set up your keys
if (!env.OPENAI_API_KEY) { // if open ai key is missing
    console.warn("⚠️  WARNING: OPENAI_API_KEY is missing from your .env file! AI routing will fail.");
}

if (!env.AGENT_WALLET_ADDRESS) { // if wallet address is missing
    console.warn("⚠️  WARNING: AGENT_WALLET_ADDRESS is missing from your .env file! Testnet payments cannot be signed.");
}

// Export the cleanly formatted object
module.exports = env;