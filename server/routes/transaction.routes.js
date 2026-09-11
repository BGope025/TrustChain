const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const algorandConfig = require('../config/algorand');

/**
 * TrustChain: Transaction & Audit Routes
 * Provides historical logs and block explorer verification for x402 settlements.
 */

// In-memory transaction history store for demo sessions
let transactionHistory = [
    {
        id: "tx-init-01",
        txHash: "TX_A9K4P2M8N1B3C7E5F9G0",
        serviceName: "MarketData Pro",
        provider: "Algorand Finance",
        amount: 0.002,
        currency: "USDC",
        fee: 0.001,
        status: "Confirmed",
        network: "algorand-testnet",
        settledAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: "tx-init-02",
        txHash: "TX_X8Y2Z1W4V7U3T9S5R2Q1",
        serviceName: "NewsPulse API",
        provider: "Data Oracle",
        amount: 0.004,
        currency: "USDC",
        fee: 0.001,
        status: "Confirmed",
        network: "algorand-testnet",
        settledAt: new Date(Date.now() - 1800000).toISOString()
    }
];

// 1. GET ALL TRANSACTIONS (Audit Log)
// Route: GET /api/transactions
router.get('/', requireAuth, (req, res) => {
    // Return newest transactions first, mapped with clickable block explorer links
    const enrichedHistory = transactionHistory.map(tx => ({
        ...tx,
        explorerUrl: algorandConfig.EXPLORER.getTxUrl(tx.txHash)
    })).reverse();

    res.json({
        success: true,
        count: enrichedHistory.length,
        transactions: enrichedHistory
    });
});

// 2. GET TRANSACTION DETAILS BY HASH
// Route: GET /api/transactions/:txHash
router.get('/:txHash', requireAuth, (req, res) => {
    const { txHash } = req.params;
    const tx = transactionHistory.find(item => item.txHash.toLowerCase() === txHash.toLowerCase());

    if (!tx) {
        return res.status(404).json({
            success: false,
            error: "Transaction record not found in audit ledger."
        });
    }

    res.json({
        success: true,
        transaction: {
            ...tx,
            explorerUrl: algorandConfig.EXPLORER.getTxUrl(tx.txHash)
        }
    });
});

// 3. LOG NEW TRANSACTION (Internal or Event Hook)
// Route: POST /api/transactions/log
router.post('/log', requireAuth, (req, res) => {
    const { txHash, serviceName, provider, amount } = req.body;

    if (!txHash || !serviceName || amount === undefined) {
        return res.status(400).json({
            success: false,
            error: "Missing required transaction parameters (txHash, serviceName, amount)."
        });
    }

    const newTx = {
        id: `tx-${Math.random().toString(36).substring(2, 8)}`,
        txHash: txHash,
        serviceName: serviceName,
        provider: provider || "Decentralized Service",
        amount: Number(amount),
        currency: "USDC",
        fee: algorandConfig.TX_PARAMS.FEE / 1000000, // Converts 1000 microAlgo to ALGO
        status: "Confirmed",
        network: algorandConfig.NODE.NETWORK,
        settledAt: new Date().toISOString()
    };

    transactionHistory.push(newTx);
    console.log(`\n📋 [Audit Ledger] Recorded new transaction: ${newTx.txHash} ($${newTx.amount} USDC)`);

    res.json({
        success: true,
        message: "Transaction logged successfully to audit ledger.",
        transaction: {
            ...newTx,
            explorerUrl: algorandConfig.EXPLORER.getTxUrl(newTx.txHash)
        }
    });
});

module.exports = router;