const algorandConfig = require('../config/algorand');
const x402Config = require('../config/x402');
const { POLICIES } = require('../config/constants');

/**
 * ASB-Pay: Payment Pipeline Service
 * Orchestrates the full x402 payment settlement lifecycle:
 *   1. Challenge  — checks if a payment is required
 *   2. Settle     — signs and submits the transaction on Algorand Testnet
 *   3. Verify     — confirms the receipt against the facilitator
 *
 * In production these steps would use the Algorand SDK and hit the real
 * x402 facilitator; for the hackathon MVP we simulate with realistic data.
 */

// ------------------------------------------
// TRANSACTION LEDGER (in-memory)
// ------------------------------------------
const transactionLedger = [];

// ------------------------------------------
// 1. BUILD PAYMENT CHALLENGE
// ------------------------------------------

/**
 * Constructs an x402 payment challenge payload for a given service.
 * This is what the server returns with an HTTP 402 status.
 *
 * @param   {Object}  options
 * @param   {number}  options.cost        - Price in USDC
 * @param   {string}  options.serviceName - Name of the protected service
 * @param   {string}  [options.recipient] - Provider's Algorand address
 * @returns {Object}  challenge payload
 */
function buildChallenge({ cost, serviceName, recipient = 'ALGO_PROVIDER_ESCROW_TESTNET' }) {
    return {
        statusCode: x402Config.STATUS.PAYMENT_REQUIRED,
        protocol: 'x402',
        service: serviceName,
        challenge: {
            amount: cost,
            currency: 'USDC',
            assetId: algorandConfig.ASSETS.USDC,
            network: 'algorand-testnet',
            recipient,
            facilitatorUrl: x402Config.FACILITATOR_URL,
            memo: `x402_req_${Date.now()}`,
            expiresIn: x402Config.TIMEOUT_MS
        },
        instructions: 'Sign transaction via x402 facilitator and resubmit ' +
                      'request with the \'x-402-receipt\' header.'
    };
}

// ------------------------------------------
// 2. SETTLE PAYMENT
// ------------------------------------------

/**
 * Simulates the full settlement flow:
 *   - Validates the amount against policy limits
 *   - Generates a mock Algorand transaction hash
 *   - Creates a cryptographic receipt token
 *   - Records the transaction in the ledger
 *
 * @param   {Object}  paymentData
 * @param   {string}  paymentData.serviceId - Target service in the marketplace
 * @param   {number}  paymentData.amount    - USDC to settle
 * @param   {string}  paymentData.provider  - Provider name
 * @param   {string}  [paymentData.memo]    - Optional memo field
 * @returns {Object}  receipt — { txHash, receiptToken, amount, settledAt }
 * @throws  {Error}   If amount exceeds per-tx limit
 */
async function settlePayment({ serviceId, amount, provider, memo }) {
    console.log(`\n💳 [Payment Service] Settling $${amount} USDC → ${provider} (${serviceId})`);

    // --- Guard-rail: per-transaction limit ---
    if (amount > POLICIES.MAX_PER_TX_SPEND) {
        throw new Error(
            `Payment of $${amount} exceeds the per-transaction limit of $${POLICIES.MAX_PER_TX_SPEND}.`
        );
    }

    // --- Simulate blockchain latency (1–2 s) ---
    const delay = 1000 + Math.floor(Math.random() * 1000);
    await new Promise(resolve => setTimeout(resolve, delay));

    // --- Generate mock settlement artifacts ---
    const txHash = 'TX_' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const receiptToken = 'x402_rcpt_' +
        Buffer.from(Date.now().toString()).toString('base64').substring(0, 16);

    const receipt = {
        txHash,
        receiptToken,
        amount,
        currency: 'USDC',
        assetId: algorandConfig.ASSETS.USDC,
        network: 'algorand-testnet',
        serviceId,
        provider,
        memo: memo || `x402_settle_${serviceId}`,
        settledAt: new Date().toISOString(),
        explorerUrl: algorandConfig.EXPLORER.getTxUrl(txHash),
        confirmations: 4,
        blockLatencyMs: delay
    };

    // --- Persist to ledger ---
    transactionLedger.push(receipt);

    console.log(`✅ [Payment Service] Settled — Hash: ${txHash} (${delay}ms)`);

    return receipt;
}

// ------------------------------------------
// 3. VERIFY RECEIPT
// ------------------------------------------

/**
 * Verifies a payment receipt against the in-memory ledger.
 * In production this would query the Algorand Indexer.
 *
 * @param   {string}  receiptToken - The x402 receipt token
 * @returns {Object}  { valid, receipt }
 */
function verifyReceipt(receiptToken) {
    const match = transactionLedger.find(tx => tx.receiptToken === receiptToken);

    if (!match) {
        console.log(`❌ [Payment Service] Receipt verification failed: ${receiptToken}`);
        return { valid: false, receipt: null };
    }

    console.log(`🎟️  [Payment Service] Receipt verified: ${match.txHash}`);
    return { valid: true, receipt: match };
}

// ------------------------------------------
// 4. TRANSACTION STATUS
// ------------------------------------------

/**
 * Looks up a transaction by its hash.
 *
 * @param   {string}  txHash
 * @returns {Object|null} Transaction record, or null if not found
 */
function getTransactionByHash(txHash) {
    return transactionLedger.find(tx => tx.txHash === txHash) || null;
}

/**
 * Returns the full transaction history, newest first.
 *
 * @param   {number} [limit=50] - Max records to return
 * @returns {Array}  Transaction records
 */
function getTransactionHistory(limit = 50) {
    return [...transactionLedger]
        .sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt))
        .slice(0, limit);
}

// ------------------------------------------
// 5. PAYMENT PIPELINE STATS
// ------------------------------------------

/**
 * Returns aggregate payment pipeline metrics.
 */
function getPipelineStats() {
    const totalSettled = transactionLedger.length;
    const totalVolume = transactionLedger.reduce((sum, tx) => sum + tx.amount, 0);
    const avgLatency = totalSettled > 0
        ? transactionLedger.reduce((sum, tx) => sum + (tx.blockLatencyMs || 0), 0) / totalSettled
        : 0;

    const providerBreakdown = {};
    for (const tx of transactionLedger) {
        if (!providerBreakdown[tx.provider]) {
            providerBreakdown[tx.provider] = { count: 0, volume: 0 };
        }
        providerBreakdown[tx.provider].count += 1;
        providerBreakdown[tx.provider].volume += tx.amount;
    }

    return {
        totalSettled,
        totalVolume: Number(totalVolume.toFixed(4)),
        averageLatencyMs: Math.round(avgLatency),
        currency: 'USDC',
        network: 'algorand-testnet',
        providerBreakdown
    };
}

// ------------------------------------------
// 6. VALIDATE INCOMING RECEIPT HEADER
// ------------------------------------------

/**
 * Utility used by the x402 middleware to check an incoming receipt header
 * and attach payment metadata to the request.
 *
 * @param   {string}  receiptHeader - Raw x-402-receipt header value
 * @param   {number}  expectedCost  - Expected service cost
 * @param   {string}  serviceName   - Name of the service being accessed
 * @returns {Object}  paymentMeta — { receipt, verified, amount, service, settledAt }
 */
function validateReceiptHeader(receiptHeader, expectedCost, serviceName) {
    const verification = verifyReceipt(receiptHeader);

    return {
        receipt: receiptHeader,
        verified: verification.valid,
        amount: expectedCost,
        service: serviceName,
        settledAt: verification.valid
            ? verification.receipt.settledAt
            : new Date().toISOString()
    };
}

// ------------------------------------------
// EXPORTS
// ------------------------------------------
module.exports = {
    buildChallenge,
    settlePayment,
    verifyReceipt,
    getTransactionByHash,
    getTransactionHistory,
    getPipelineStats,
    validateReceiptHeader
};
