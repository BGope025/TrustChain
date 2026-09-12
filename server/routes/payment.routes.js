const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { validatePaymentRequest } = require('../middleware/validation.middleware');
const env = require('../config/env');

// Import hooks from our other modules to sync balances and history dynamically
const walletRoutes = require('./wallet.routes');
const transactionRoutes = require('./transaction.routes');

/**
 * TrustChain: Payment Routes
 * Handles manual execution of x402 payments and human approval overrides.
 */

// Root fallback
router.get('/', requireAuth, (req, res) => {
    res.json({
        service: "TrustChain x402 Payment Settlement",
        status: "online",
        currency: "USDC",
        endpoints: ["POST /api/payment/execute", "POST /api/payment/purchase", "GET /api/payment/status/:txHash"]
    });
});

// Core payment execution handler shared between execute and purchase routes
const handlePaymentExecution = async (req, res) => {
    // Support both old keys (serviceId, amount, provider) and frontend UI keys (serviceId, walletAddress, quantity)
    const { serviceId, amount, provider, walletAddress, quantity = 1 } = req.body;

    const targetService = serviceId || "generic-api-service";
    const paymentAmount = amount !== undefined ? Number(amount) : (0.005 * Number(quantity));
    const senderAddress = walletAddress || env.AGENT_WALLET_ADDRESS || "YMSRXTYJA6SCU6OBPXGY2AO2OE6BAIF24JLGSZZBPRD5JRYWZV62LYA4FQ";

    console.log(`\n💳 [Payment Engine] Manual x402 payment initiated by user.`);
    console.log(`🎯 [Target] Service: ${targetService} | Amount: $${paymentAmount} USDC`);

    try {
        // --- STEP 1: Check Wallet Balance ---
        const currentBalance = walletRoutes.getCredits ? walletRoutes.getCredits() : 50.0;

        if (currentBalance < paymentAmount) {
            return res.status(402).json({
                success: false,
                error: "Insufficient USDC balance to execute this call.",
                required: paymentAmount,
                currentBalance: currentBalance,
                currency: "USDC"
            });
        }

        // --- STEP 2: Simulate Network & Facilitator Processing ---
        console.log(`⏳ [x402 Facilitator] Verifying transaction on Algorand Testnet...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // --- STEP 3: Generate Settlement Data & Receipt ---
        const mockTxHash = "TX_" + Math.random().toString(36).substring(2, 12).toUpperCase();
        const receiptToken = "x402_rcpt_" + Buffer.from(Date.now().toString()).toString('base64').substring(0, 16);

        // Deduct credits from the shared wallet state
        const remainingBalance = walletRoutes.deductCredits ? walletRoutes.deductCredits(paymentAmount) : (currentBalance - paymentAmount);

        // Construct standardized transaction record
        const txRecord = {
            id: `tx-${Math.random().toString(36).substring(2, 8)}`,
            txId: mockTxHash,
            txHash: mockTxHash,
            type: "API_PURCHASE",
            serviceId: targetService.toLowerCase().replace(/\s+/g, '-'),
            serviceName: targetService,
            provider: provider || "Decentralized Service Provider",
            sender: senderAddress,
            receiver: "PROVIDER_TREASURY_ACCOUNT",
            amount: paymentAmount,
            currency: "USDC",
            fee: 0.001,
            status: "Confirmed",
            network: "algorand-testnet",
            timestamp: new Date().toISOString(),
            settledAt: new Date().toISOString(),
            explorerUrl: `https://testnet.explorer.perawallet.app/tx/${mockTxHash}`
        };

        // Push into global transaction audit log
        if (transactionRoutes.addTransaction) {
            transactionRoutes.addTransaction(txRecord);
        }

        console.log(`✅ [Payment Engine] Settlement successful! Hash: ${mockTxHash}`);

        // --- STEP 4: Return Hybrid Response (Old + New UI Schemas) ---
        return res.json({
            success: true,
            message: "Payment successfully settled on Algorand Testnet.",
            serviceId: targetService,

            // Your original receipt object structure
            receipt: {
                token: receiptToken,
                txHash: mockTxHash,
                amountPaid: paymentAmount,
                currency: "USDC",
                network: "algorand-testnet",
                timestamp: txRecord.timestamp
            },

            // Frontend UI expected transaction object and remaining balance
            transaction: txRecord,
            remainingBalance: {
                usdc: parseFloat(remainingBalance.toFixed(4)),
                credits: parseFloat(remainingBalance.toFixed(4))
            },
            data: {
                status: "Success",
                executionLatency: "14ms",
                message: `Service ${targetService} executed via x402 settlement.`,
                output: {
                    status: "active",
                    result: `Payload delivered successfully for ${targetService}`
                }
            }
        });

    } catch (error) {
        console.error(`🚨 [Payment Engine] Error during settlement:`, error);
        return res.status(500).json({
            success: false,
            error: "Payment settlement failed. Please try again."
        });
    }
};

// 1. EXECUTE X402 PAYMENT
// Route: POST /api/payment/execute
router.post('/execute', requireAuth, validatePaymentRequest, handlePaymentExecution);

// 2. MARKETPLACE PURCHASE ALIAS
// Route: POST /api/payment/purchase
router.post('/purchase', requireAuth, handlePaymentExecution);

// 3. CHECK PAYMENT STATUS
// Route: GET /api/payment/status/:txHash
router.get('/status/:txHash', requireAuth, (req, res) => {
    const { txHash } = req.params;

    res.json({
        success: true,
        txHash: txHash,
        status: "Confirmed",
        confirmations: 4,
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txHash}`
    });
});

module.exports = router;