const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const algorandConfig = require('../config/algorand');
const env = require('../config/env'); // Ensure env is required for fallback wallet addresses

/**
 * TrustChain: Transaction & Audit Routes
 * Provides historical logs and block explorer verification for x402 settlements.
 */

// In-memory transaction history store for demo sessions
// Unified to include BOTH your original fields and the new fields requested by the frontend UI
let transactionHistory = [
    {
        id: "tx-init-01",
        txId: "TX_A9K4P2M8N1B3C7E5F9G0", // Frontend UI requested txId
        txHash: "TX_A9K4P2M8N1B3C7E5F9G0", // Original field
        type: "API_PURCHASE",
        serviceId: "srv-market-pro",
        serviceName: "MarketData Pro",
        provider: "Algorand Finance",
        sender: env.AGENT_WALLET_ADDRESS || "YMSRXTYJA6SCU6OBPXGY2AO2OE6BAIF24JLGSZZBPRD5JRYWZV62LYA4FQ",
        receiver: "PROVIDER_ALGORAND_FINANCE_WALLET",
        amount: 0.002,
        currency: "USDC",
        fee: 0.001,
        status: "Confirmed",
        network: "algorand-testnet",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // Frontend UI requested timestamp
        settledAt: new Date(Date.now() - 3600000).toISOString() // Original field
    },
    {
        id: "tx-init-02",
        txId: "TX_X8Y2Z1W4V7U3T9S5R2Q1",
        txHash: "TX_X8Y2Z1W4V7U3T9S5R2Q1",
        type: "API_PURCHASE",
        serviceId: "srv-news-pulse",
        serviceName: "NewsPulse API",
        provider: "Data Oracle",
        sender: env.AGENT_WALLET_ADDRESS || "YMSRXTYJA6SCU6OBPXGY2AO2OE6BAIF24JLGSZZBPRD5JRYWZV62LYA4FQ",
        receiver: "PROVIDER_DATA_ORACLE_WALLET",
        amount: 0.004,
        currency: "USDC",
        fee: 0.001,
        status: "Confirmed",
        network: "algorand-testnet",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        settledAt: new Date(Date.now() - 1800000).toISOString()
    }
];

// 1. GET ALL TRANSACTIONS (Audit Log)
// Route: GET /api/transactions
// Updated to support frontend UI pagination (page, limit) and wallet address filtering
router.get('/', requireAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const address = req.query.address;

    // Map explorer URLs securely
    let enrichedHistory = transactionHistory.map(tx => ({
        ...tx,
        explorerUrl: algorandConfig.EXPLORER.getTxUrl(tx.txHash)
    })).reverse(); // Newest first

    // Filter by address if requested by the UI
    if (address) {
        enrichedHistory = enrichedHistory.filter(t => 
            (t.sender && t.sender.toLowerCase() === address.toLowerCase()) || 
            (t.receiver && t.receiver.toLowerCase() === address.toLowerCase())
        );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginated = enrichedHistory.slice(startIndex, startIndex + limit);

    res.json({
        success: true,
        count: enrichedHistory.length, // Your original field
        
        // --- NEW FIELDS: UI Pagination metadata ---
        page: page,
        limit: limit,
        total: enrichedHistory.length,
        totalPages: Math.ceil(enrichedHistory.length / limit),
        
        transactions: paginated
    });
});

// 2. GET TRANSACTION DETAILS BY HASH
// Route: GET /api/transactions/:txHash
// Preserved exactly as you had it
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

    // Hybrid object supporting both old UI schemas and new UI schemas
    const newTx = {
        id: `tx-${Math.random().toString(36).substring(2, 8)}`,
        txId: txHash, // UI alias
        txHash: txHash,
        type: "API_PURCHASE",
        serviceId: serviceName.toLowerCase().replace(/\s+/g, '-'),
        serviceName: serviceName,
        provider: provider || "Decentralized Service",
        sender: env.AGENT_WALLET_ADDRESS || "YMSRXTYJA6SCU6OBPXGY2AO2OE6BAIF24JLGSZZBPRD5JRYWZV62LYA4FQ",
        receiver: "PROVIDER_GENERIC",
        amount: Number(amount),
        currency: "USDC",
        fee: algorandConfig.TX_PARAMS.FEE / 1000000, // Converts 1000 microAlgo to ALGO
        status: "Confirmed",
        network: algorandConfig.NODE.NETWORK,
        timestamp: new Date().toISOString(), // UI alias
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

// EXPORT METHOD: Allows internal routes (like payment.routes.js or agent.routes.js) 
// to automatically push new transactions directly into this array without making a POST request.
module.exports.addTransaction = (tx) => {
    transactionHistory.push(tx);
};