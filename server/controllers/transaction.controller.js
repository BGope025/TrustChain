const algorandConfig = require('../config/algorand');

/**
 * TrustChain: Transaction Controller
 * Handles HTTP request/response for the audit ledger — historical
 * transaction logs and block explorer verification for x402 settlements.
 */

// IN-MEMORY TRANSACTION HISTORY
const transactionHistory = [
    {
        id: 'tx-init-01',
        txHash: 'TX_A9K4P2M8N1B3C7E5F9G0',
        serviceName: 'MarketData Pro',
        provider: 'Algorand Finance',
        amount: 0.002,
        currency: 'USDC',
        fee: 0.001,
        status: 'Confirmed',
        network: 'algorand-testnet',
        settledAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 'tx-init-02',
        txHash: 'TX_X8Y2Z1W4V7U3T9S5R2Q1',
        serviceName: 'NewsPulse API',
        provider: 'Data Oracle',
        amount: 0.004,
        currency: 'USDC',
        fee: 0.001,
        status: 'Confirmed',
        network: 'algorand-testnet',
        settledAt: new Date(Date.now() - 1800000).toISOString()
    }
];

// 1. GET ALL TRANSACTIONS (Audit Log)
// Handler for: GET /api/transactions
function getAllTransactions(req, res) {
    const { limit, status, provider } = req.query;
    let results = [...transactionHistory];

    // --- Optional filters ---
    if (status) {
        results = results.filter(tx => tx.status.toLowerCase() === status.toLowerCase());
    }
    if (provider) {
        results = results.filter(tx => tx.provider.toLowerCase().includes(provider.toLowerCase()));
    }

    // Enrich with explorer links, newest first
    const enrichedHistory = results
        .map(tx => ({
            ...tx,
            explorerUrl: algorandConfig.EXPLORER.getTxUrl(tx.txHash)
        }))
        .reverse();

    // Apply limit
    const capped = limit ? enrichedHistory.slice(0, parseInt(limit, 10)) : enrichedHistory;

    res.json({
        success: true,
        count: capped.length,
        transactions: capped
    });
}

// 2. GET TRANSACTION DETAILS BY HASH
// Handler for: GET /api/transactions/:txHash
function getTransactionByHash(req, res) {
    const { txHash } = req.params;
    const tx = transactionHistory.find(
        item => item.txHash.toLowerCase() === txHash.toLowerCase()
    );

    if (!tx) {
        return res.status(404).json({
            success: false,
            error: 'Transaction record not found in audit ledger.'
        });
    }

    res.json({
        success: true,
        transaction: {
            ...tx,
            explorerUrl: algorandConfig.EXPLORER.getTxUrl(tx.txHash)
        }
    });
}

// 3. LOG NEW TRANSACTION
// Handler for: POST /api/transactions/log
function logTransaction(req, res) {
    const { txHash, serviceName, provider, amount } = req.body;

    if (!txHash || !serviceName || amount === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required transaction parameters (txHash, serviceName, amount).'
        });
    }

    const newTx = {
        id: `tx-${Math.random().toString(36).substring(2, 8)}`,
        txHash,
        serviceName,
        provider: provider || 'Decentralized Service',
        amount: Number(amount),
        currency: 'USDC',
        fee: algorandConfig.TX_PARAMS.FEE / 1000000, // Converts microAlgo to ALGO
        status: 'Confirmed',
        network: algorandConfig.NODE.NETWORK,
        settledAt: new Date().toISOString()
    };

    transactionHistory.push(newTx);
    console.log(`\n📋 [Transaction Controller] Recorded: ${newTx.txHash} ($${newTx.amount} USDC)`);

    res.json({
        success: true,
        message: 'Transaction logged successfully to audit ledger.',
        transaction: {
            ...newTx,
            explorerUrl: algorandConfig.EXPLORER.getTxUrl(newTx.txHash)
        }
    });
}

// 4. GET TRANSACTION SUMMARY / STATS
// Handler for: GET /api/transactions/summary
function getTransactionSummary(req, res) {
    const totalTx = transactionHistory.length;
    const totalVolume = transactionHistory.reduce((sum, tx) => sum + tx.amount, 0);
    const totalFees = transactionHistory.reduce((sum, tx) => sum + (tx.fee || 0), 0);

    const confirmed = transactionHistory.filter(tx => tx.status === 'Confirmed').length;

    // Per-provider aggregation
    const providerVolumes = {};
    for (const tx of transactionHistory) {
        if (!providerVolumes[tx.provider]) {
            providerVolumes[tx.provider] = { count: 0, volume: 0 };
        }
        providerVolumes[tx.provider].count += 1;
        providerVolumes[tx.provider].volume += tx.amount;
    }

    res.json({
        success: true,
        summary: {
            totalTransactions: totalTx,
            confirmedTransactions: confirmed,
            totalVolume: Number(totalVolume.toFixed(4)),
            totalFees: Number(totalFees.toFixed(6)),
            currency: 'USDC',
            network: algorandConfig.NODE.NETWORK,
            byProvider: providerVolumes,
            oldestTransaction: transactionHistory.length > 0
                ? transactionHistory[0].settledAt
                : null,
            newestTransaction: transactionHistory.length > 0
                ? transactionHistory[transactionHistory.length - 1].settledAt
                : null
        }
    });
}

// EXPORTS
module.exports = {
    getAllTransactions,
    getTransactionByHash,
    logTransaction,
    getTransactionSummary
};
