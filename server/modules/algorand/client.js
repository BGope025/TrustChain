const algorandConfig = require('../../config/algorand');
const env = require('../../config/env');

/**
 * TrustChain: Algorand Client
 * Creates and manages the Algod and Indexer client instances.
 *
 * In production this uses the `algosdk` package. For the hackathon MVP
 * we expose a mock-compatible interface that mirrors the real SDK's API
 * surface so the rest of the codebase stays production-ready.
 */

// CLIENT STATE
let algodClient = null;
let indexerClient = null;
let clientReady = false;

// 1. INITIALISE CLIENTS

/**
 * Initialises the Algod and Indexer clients.
 * Safe to call multiple times — returns cached instances after first init.
 *
 * @returns {Object} { algod, indexer, network }
 */
function init() {
    if (clientReady) {
        return { algod: algodClient, indexer: indexerClient, network: algorandConfig.NODE.NETWORK };
    }

    // ── Algod Client (Blockchain Node) 
    algodClient = {
        server: algorandConfig.NODE.SERVER,
        port: algorandConfig.NODE.PORT,
        token: algorandConfig.NODE.TOKEN,

        /** Fetches suggested transaction parameters. */
        async getTransactionParams() {
            return {
                fee: algorandConfig.TX_PARAMS.FEE,
                flatFee: algorandConfig.TX_PARAMS.FLAT_FEE,
                firstRound: 30000000 + Math.floor(Math.random() * 1000),
                lastRound:  30001000 + Math.floor(Math.random() * 1000),
                genesisID: algorandConfig.NODE.NETWORK === 'mainnet' ? 'mainnet-v1.0' : 'testnet-v1.0',
                genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='
            };
        },

        /** Returns account information by address. */
        async accountInformation(address) {
            return {
                address,
                amount: Math.floor(12.45 * 1e6),     // microAlgos
                'min-balance': 100000,
                status: 'Offline',
                assets: [
                    { 'asset-id': algorandConfig.ASSETS.USDC, amount: Math.floor(24.85 * 1e6) }
                ],
                'created-at-round': 28500000
            };
        },

        /** Returns the current node status. */
        async status() {
            return {
                'last-round': 30000500,
                'time-since-last-round': 3200000000, // nanoseconds
                'catchup-time': 0,
                'last-version': 'v2.0',
                'next-version': 'v2.0',
                'stopped-at-unsupported-round': false
            };
        },

        /** Sends a signed transaction to the network. */
        async sendRawTransaction(signedTxn) {
            const txId = 'TX_' + Math.random().toString(36).substring(2, 12).toUpperCase();
            console.log(`📤 [Algod] Transaction submitted: ${txId}`);
            return { txId };
        },

        /** Waits for a transaction to be confirmed. */
        async waitForConfirmation(txId, rounds = 4) {
            await new Promise(r => setTimeout(r, 500));
            return {
                'confirmed-round': 30000500 + rounds,
                'pool-error': '',
                txn: { txn: { type: 'pay' } }
            };
        }
    };

    // ── Indexer Client (Historical Queries) 
    indexerClient = {
        server: algorandConfig.INDEXER.SERVER,
        port: algorandConfig.INDEXER.PORT,
        token: algorandConfig.INDEXER.TOKEN,

        /** Searches for transactions by address. */
        async searchForTransactions(address, limit = 10) {
            return {
                transactions: [],
                'current-round': 30000500
            };
        },

        /** Looks up a single transaction by ID. */
        async lookupTransactionByID(txId) {
            return {
                'current-round': 30000500,
                transaction: {
                    id: txId,
                    'confirmed-round': 30000450,
                    'round-time': Math.floor(Date.now() / 1000),
                    'tx-type': 'axfer',
                    'asset-transfer-transaction': {
                        amount: 2000,
                        'asset-id': algorandConfig.ASSETS.USDC,
                        receiver: 'PROVIDER_ADDRESS'
                    }
                }
            };
        },

        /** Looks up asset information. */
        async lookupAssetByID(assetId) {
            return {
                asset: {
                    index: assetId,
                    params: {
                        name: assetId === algorandConfig.ASSETS.USDC ? 'USDC' : 'Unknown',
                        'unit-name': assetId === algorandConfig.ASSETS.USDC ? 'USDC' : 'UNK',
                        decimals: 6,
                        total: 10000000000
                    }
                }
            };
        }
    };

    clientReady = true;
    console.log(`✅ [Algorand Client] Initialised — Network: ${algorandConfig.NODE.NETWORK}`);

    return { algod: algodClient, indexer: indexerClient, network: algorandConfig.NODE.NETWORK };
}

// 2. CLIENT GETTERS

/** Returns the Algod client (initialises if needed). */
function getAlgod() {
    if (!clientReady) init();
    return algodClient;
}

/** Returns the Indexer client (initialises if needed). */
function getIndexer() {
    if (!clientReady) init();
    return indexerClient;
}

// 3. HEALTH CHECK

/**
 * Checks if both clients can reach their respective nodes.
 *
 * @returns {Object} { healthy, algod, indexer, network, latencyMs }
 */
async function healthCheck() {
    const start = Date.now();

    try {
        if (!clientReady) init();

        const status = await algodClient.status();
        const latencyMs = Date.now() - start;

        return {
            healthy: true,
            algod: { connected: true, lastRound: status['last-round'] },
            indexer: { connected: true },
            network: algorandConfig.NODE.NETWORK,
            latencyMs
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            network: algorandConfig.NODE.NETWORK,
            latencyMs: Date.now() - start
        };
    }
}

// EXPORTS
module.exports = {
    init,
    getAlgod,
    getIndexer,
    healthCheck
};
