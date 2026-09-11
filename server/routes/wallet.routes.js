const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { POLICIES } = require('../config/constants');
const algorandConfig = require('../config/algorand');
const env = require('../config/env');

/**
 * TrustChain: Agent Wallet & Policy Routes
 * Manages the agent's funds, testnet balances, and active policy guardrails.
 */

// In-memory wallet state for the session
const walletState = {
    address: env.AGENT_WALLET_ADDRESS || "ALGO_7X9K2M4PN5Q8WTESTNETADDRESS99",
    algoBalance: 12.450,
    usdcBalance: 24.850,
    dailyLimit: POLICIES.MAX_DAILY_SPEND,
    maxPerTx: POLICIES.MAX_PER_TX_SPEND,
    spentToday: 0.012,
    currency: POLICIES.SUPPORTED_CURRENCY,
    network: algorandConfig.NODE.NETWORK
};

// 1. GET WALLET DETAILS & POLICY STATUS
// Route: GET /api/wallet
router.get('/', requireAuth, (req, res) => {
    const remainingDailyBudget = Math.max(0, walletState.dailyLimit - walletState.spentToday);

    res.json({
        success: true,
        wallet: {
            address: walletState.address,
            balances: {
                algo: Number(walletState.algoBalance.toFixed(3)),
                usdc: Number(walletState.usdcBalance.toFixed(4))
            },
            policies: {
                dailyLimit: walletState.dailyLimit,
                maxPerTx: walletState.maxPerTx,
                spentToday: Number(walletState.spentToday.toFixed(4)),
                remainingBudget: Number(remainingDailyBudget.toFixed(4)),
                autoApproveThreshold: POLICIES.AUTO_APPROVE_THRESHOLD
            },
            explorer: {
                accountUrl: algorandConfig.EXPLORER.getAccountUrl(walletState.address)
            }
        }
    });
});

// 2. FUND / TOP-UP WALLET (Demo Faucet)
// Route: POST /api/wallet/fund
router.post('/fund', requireAuth, (req, res) => {
    const amount = Number(req.body.amount) || 10.0;

    walletState.usdcBalance += amount;
    walletState.algoBalance += 2.0; // Add standard gas allowance

    console.log(`\n💳 [Wallet Faucet] Added +$${amount.toFixed(2)} USDC & +2.0 ALGO to Agent Wallet`);

    res.json({
        success: true,
        message: `Successfully topped up wallet with ${amount} USDC and 2.0 ALGO.`,
        balances: {
            algo: Number(walletState.algoBalance.toFixed(3)),
            usdc: Number(walletState.usdcBalance.toFixed(4))
        }
    });
});

// 3. UPDATE SPENDING POLICY
// Route: POST /api/wallet/policy
// Allows live demonstration of agent spending limit guardrails
router.post('/policy', requireAuth, (req, res) => {
    const { dailyLimit, maxPerTx } = req.body;

    if (dailyLimit !== undefined) {
        walletState.dailyLimit = Number(dailyLimit);
    }
    if (maxPerTx !== undefined) {
        walletState.maxPerTx = Number(maxPerTx);
    }

    console.log(`🛡️ [Policy Engine] Updated limits -> Daily: $${walletState.dailyLimit}, Max/Tx: $${walletState.maxPerTx}`);

    res.json({
        success: true,
        message: "Agent spending policies updated successfully.",
        policies: {
            dailyLimit: walletState.dailyLimit,
            maxPerTx: walletState.maxPerTx,
            spentToday: walletState.spentToday
        }
    });
});

module.exports = router;