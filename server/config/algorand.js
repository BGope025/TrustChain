const env = require('./env');

/**
 * TrustChain: Algorand Network Configuration
 * This file centralizes the connection details for the Algorand blockchain.
 * We default to public AlgoNode servers for the hackathon so no API keys are required.
 */

const algorandConfig = {
    // "Networkconnections" (ALGOD = The Blockchain Node)
    NODE: {
        SERVER: env.ALGOD_SERVER,
        PORT: env.ALGOD_PORT,
        TOKEN: env.ALGOD_TOKEN,
        NETWORK: env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
    },

    // "Indexer connection" (Used for searching past transactions)
    INDEXER: {
        SERVER: 'https://testnet-idx.algonode.cloud',
        PORT: 443,
        TOKEN: ''
    },

    // "Assets and tokens"
    ASSETS: {
        ALGO: 0, // The native gas token
        USDC: 10458941 // The standard USDC stablecoin ID on Algorand Testnet
    },

    // "Explorer links" (Crucial for the ui dashboard)
    // We use this to generate clickable links for the frontend so judges 
    // can view the "settled" transactions on a real block explorer.
    EXPLORER: {
        BASE_URL: 'https://testnet.explorer.perawallet.app',

        // Helper function to generate a transaction link
        getTxUrl: (txId) => `https://testnet.explorer.perawallet.app/tx/${txId}`,

        // Helper function to generate an account link
        getAccountUrl: (address) => `https://testnet.explorer.perawallet.app/address/${address}`
    },

    // "Transaction defaults"
    TX_PARAMS: {
        FEE: 1000, // Standard minimum fee (0.001 ALGO)
        FLAT_FEE: true
    }
};
module.exports = algorandConfig;