const paymentService = require('../services/payment.service');
const walletService = require('../services/wallet.service');

/**
 * TrustChain: Payment Controller
 * Handles HTTP request/response for x402 payment execution, status checks,
 * and transaction history. Delegates settlement logic to payment.service.js.
 */

// 1. EXECUTE X402 PAYMENT
// Handler for: POST /api/payment/execute
async function executePayment(req, res) {
    const { serviceId, amount, provider } = req.body;

    console.log(`\n💳 [Payment Controller] Manual x402 payment initiated by user.`);
    console.log(`🎯 [Target] Service: ${serviceId} | Amount: $${amount} USDC`);

    try {
        // --- Settle via the payment service ---
        const receipt = await paymentService.settlePayment({
            serviceId,
            amount: Number(amount),
            provider: provider || 'Unknown Provider'
        });

        // --- Debit the wallet ---
        walletService.recordSpend(Number(amount));

        console.log(`✅ [Payment Controller] Settlement successful! Hash: ${receipt.txHash}`);

        return res.json({
            success: true,
            message: 'Payment successfully settled on Algorand Testnet.',
            receipt: {
                token: receipt.receiptToken,
                txHash: receipt.txHash,
                amountPaid: receipt.amount,
                currency: receipt.currency,
                network: receipt.network,
                explorerUrl: receipt.explorerUrl,
                timestamp: receipt.settledAt
            }
        });

    } catch (error) {
        console.error(`🚨 [Payment Controller] Error during settlement:`, error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Payment settlement failed. Please try again.'
        });
    }
}

// 2. CHECK PAYMENT STATUS BY TX HASH
// Handler for: GET /api/payment/status/:txHash
function getPaymentStatus(req, res) {
    const { txHash } = req.params;
    const tx = paymentService.getTransactionByHash(txHash);

    if (tx) {
        return res.json({
            success: true,
            txHash: tx.txHash,
            status: 'Confirmed',
            confirmations: tx.confirmations || 4,
            amount: tx.amount,
            currency: tx.currency,
            provider: tx.provider,
            explorerUrl: tx.explorerUrl,
            settledAt: tx.settledAt
        });
    }

    // Fallback for hashes not in ledger (demo-friendly)
    res.json({
        success: true,
        txHash,
        status: 'Confirmed',
        confirmations: 4,
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txHash}`
    });
}

// 3. VERIFY A PAYMENT RECEIPT
// Handler for: POST /api/payment/verify
function verifyReceipt(req, res) {
    const { receiptToken } = req.body;

    if (!receiptToken) {
        return res.status(400).json({
            success: false,
            error: 'Missing required field: receiptToken'
        });
    }

    const verification = paymentService.verifyReceipt(receiptToken);

    res.json({
        success: true,
        valid: verification.valid,
        receipt: verification.receipt
    });
}

// 4. GET TRANSACTION HISTORY
// Handler for: GET /api/payment/history
function getTransactionHistory(req, res) {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = paymentService.getTransactionHistory(limit);

    res.json({
        success: true,
        count: history.length,
        transactions: history
    });
}

// 5. GET PAYMENT PIPELINE STATS
// Handler for: GET /api/payment/stats
function getPipelineStats(req, res) {
    const stats = paymentService.getPipelineStats();

    res.json({
        success: true,
        stats
    });
}

// EXPORTS
module.exports = {
    executePayment,
    getPaymentStatus,
    verifyReceipt,
    getTransactionHistory,
    getPipelineStats
};
