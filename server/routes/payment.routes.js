const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { validatePaymentRequest } = require('../middleware/validation.middleware');
const env = require('../config/env');

/**
 * TrustChain: Payment Routes
 * Handles manual execution of x402 payments. This is perfect for the "Human Approval Required" override feature in your hackathon pitch.
 */

// 1. EXECUTE X402 PAYMENT
// Route: POST /api/payment/execute
// Middlewares: Auth check, Payload validation
router.post('/execute', requireAuth, validatePaymentRequest, async (req, res) => {
    const { serviceId, amount, provider } = req.body;

    console.log(`\n💳 [Payment Engine] Manual x402 payment initiated by user.`);
    console.log(`🎯 [Target] Service: ${serviceId} | Amount: $${amount} USDC`);

    try {
        // --- STEP 1: Simulate Network & Facilitator Processing ---
        console.log(`⏳ [x402 Facilitator] Verifying transaction on Algorand Testnet...`);

        // Add a 2-second delay so the frontend loading spinner looks realistic
        await new Promise(resolve => setTimeout(resolve, 2000));

        // --- STEP 2: Generate Mock Settlement Data ---
        // Create a random Algorand transaction hash (e.g., TX_8F29A...)
        const mockTxHash = "TX_" + Math.random().toString(36).substring(2, 12).toUpperCase();

        // Generate the fake cryptographic receipt that the API will look for
        const receiptToken = "x402_rcpt_" + Buffer.from(Date.now().toString()).toString('base64').substring(0, 16);

        console.log(`✅ [Payment Engine] Settlement successful! Hash: ${mockTxHash}`);

        // --- STEP 3: Return the Receipt ---
        return res.json({
            success: true,
            message: "Payment successfully settled on Algorand Testnet.",
            receipt: {
                token: receiptToken,
                txHash: mockTxHash,
                amountPaid: amount,
                currency: "USDC",
                network: "algorand-testnet",
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        // Catch any unexpected crashes and send them to your global error handler
        console.error(`🚨 [Payment Engine] Error during settlement:`, error);
        return res.status(500).json({
            success: false,
            error: "Payment settlement failed. Please try again."
        });
    }
});

// 2. CHECK PAYMENT STATUS
// Route: GET /api/payment/status/:txHash
router.get('/status/:txHash', requireAuth, (req, res) => {
    const { txHash } = req.params;

    // In a real app, this would query the Algorand Indexer to check if the block confirmed.
    // For the MVP, we just return a guaranteed success if they query a hash.
    res.json({
        success: true,
        txHash: txHash,
        status: "Confirmed",
        confirmations: 4,
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txHash}`
    });
});

module.exports = router;