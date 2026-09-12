const express = require('express');
const router = express.Router();
const algosdk = require('algosdk'); // Added to fetch live on-chain balances
const { requireAuth } = require('../middleware/auth.middleware');
const { POLICIES } = require('../config/constants');
const algorandConfig = require('../config/algorand');
const env = require('../config/env');

/**
 * TrustChain: Agent Wallet & Policy Routes
 * Manages the agent's funds, testnet balances, and active policy guardrails.
 */

// Initialize the Algorand Client (Uses env variables or falls back to public testnet node)
const algodClient = new algosdk.Algodv2(
    env.ALGOD_TOKEN || '', 
    env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud', 
    env.ALGOD_PORT || 443
);

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

// 1. GET WALLET DETAILS & POLICY STATUS (Merged Logic)
// Route: GET /api/wallet OR GET /api/wallet/:address
router.get('{/:address}', requireAuth, async (req, res) => {
    try {
        const address = req.params.address || walletState.address;
        const usdcAssetId = parseInt(env.USDC_TESTNET_ASSET_ID || 10458941);

        let algoBal = walletState.algoBalance;
        let usdcBal = walletState.usdcBalance;

        // Attempt to fetch live blockchain data
        try {
            const accountInfo = await algodClient.accountInformation(address).do();
            algoBal = accountInfo.amount / 1000000; // ALGO has 6 decimals

            if (accountInfo.assets) {
                const asset = accountInfo.assets.find(a => a['asset-id'] === usdcAssetId);
                if (asset) {
                    usdcBal = asset.amount / 1000000; // USDC Testnet has 6 decimals
                }
            }
            
            // Sync local state if we fetched the agent's primary wallet
            if (address === walletState.address) {
                walletState.algoBalance = algoBal;
                walletState.usdcBalance = usdcBal;
            }
        } catch (chainErr) {
            console.warn(`⚠️ [Wallet Route] Live fetch throttled, using local state for ${address}`);
        }

        const remainingDailyBudget = Math.max(0, walletState.dailyLimit - walletState.spentToday);

        // Send hybrid response satisfying both old code logic and new frontend requirements
        res.json({
            success: true,
            
            // --- NEW: Top-level fields requested by frontend UI ---
            address: address,
            network: walletState.network,
            algoBalance: parseFloat(algoBal.toFixed(4)),
            usdcBalance: parseFloat(usdcBal.toFixed(4)),
            availableCredits: parseFloat(usdcBal.toFixed(4)),
            assets: [
                {
                    assetId: usdcAssetId,
                    name: "USDC",
                    unitName: "USDC",
                    amount: parseFloat(usdcBal.toFixed(4))
                }
            ],
            
            // --- ORIGINAL: Nested object preserved for backwards compatibility ---
            wallet: {
                address: address,
                balances: {
                    algo: Number(algoBal.toFixed(3)),
                    usdc: Number(usdcBal.toFixed(4))
                },
                policies: {
                    dailyLimit: walletState.dailyLimit,
                    maxPerTx: walletState.maxPerTx,
                    spentToday: Number(walletState.spentToday.toFixed(4)),
                    remainingBudget: Number(remainingDailyBudget.toFixed(4)),
                    autoApproveThreshold: POLICIES.AUTO_APPROVE_THRESHOLD
                },
                explorer: {
                    accountUrl: algorandConfig.EXPLORER.getAccountUrl(address)
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
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

// --- EXPORTED METHODS FOR PAYMENT ROUTES ---
// These allow your payment/agent execution routes to safely modify the wallet state
module.exports.getCredits = () => walletState.usdcBalance;
module.exports.deductCredits = (amount) => {
    walletState.usdcBalance = Math.max(0, walletState.usdcBalance - amount);
    walletState.spentToday += amount;
    return walletState.usdcBalance;
};