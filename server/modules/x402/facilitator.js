const algorandConfig = require('../../config/algorand');
const x402Config = require('../../config/x402');
const receipt = require('./receipt');

/**
 * TrustChain: x402 Facilitator
 * Manages the settlement handshake between the AI agent (payer) and
 * the API provider (payee) via the x402 facilitator node.
 *
 * Facilitator responsibilities:
 *   1. Validates the payment request
 *   2. Coordinates the on-chain USDC transfer
 *   3. Issues a cryptographic receipt upon confirmation
 *   4. Notifies both parties of settlement status
 */

// SETTLEMENT LEDGER
const settlementLedger = [];
const MAX_LEDGER = 500;

// 1. SETTLE PAYMENT

/**
 * Settles a micro-payment through the x402 facilitator.
 *
 * @param   {Object}  params
 * @param   {number}  params.amount     - USDC amount to settle
 * @param   {string}  params.recipient  - Provider's Algorand address
 * @param   {string}  params.serviceId  - Marketplace service ID
 * @param   {string}  [params.memo]     - On-chain memo
 * @returns {Object}  settlement — { txHash, confirmedRound, receipt, latencyMs }
 */
async function settle({ amount, recipient, serviceId, memo = '' }) {
    const startTime = Date.now();

    console.log(
        `\n⚡ [Facilitator] Settlement request — ` +
        `$${amount} USDC → ${recipient} (${serviceId})`
    );

    // ── Step 1: Validate request 
    _validateSettlementRequest(amount, recipient);

    // ── Step 2: Simulate blockchain settlement 
    // In production: build + sign + submit Algorand ASA transfer
    const networkDelay = 800 + Math.floor(Math.random() * 1200);
    await new Promise(r => setTimeout(r, networkDelay));

    const txHash = 'TX_' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const confirmedRound = 30000000 + Math.floor(Math.random() * 5000);

    // ── Step 3: Generate receipt 
    const paymentReceipt = receipt.generate({
        txHash,
        amount,
        serviceId,
        serviceName: serviceId
    });

    // ── Step 4: Record in ledger 
    const settlement = {
        txHash,
        confirmedRound,
        amount,
        currency: 'USDC',
        assetId: algorandConfig.ASSETS.USDC,
        recipient,
        serviceId,
        memo: memo || `x402_settle_${serviceId}`,
        receiptToken: paymentReceipt.token,
        network: 'algorand-testnet',
        facilitatorUrl: x402Config.FACILITATOR_URL,
        latencyMs: Date.now() - startTime,
        status: 'confirmed',
        settledAt: new Date().toISOString(),
        explorerUrl: algorandConfig.EXPLORER.getTxUrl(txHash)
    };

    settlementLedger.push(settlement);
    if (settlementLedger.length > MAX_LEDGER) settlementLedger.shift();

    console.log(
        `✅ [Facilitator] Settled — Hash: ${txHash}, ` +
        `Round: ${confirmedRound}, ${settlement.latencyMs}ms`
    );

    return settlement;
}

// 2. VERIFY SETTLEMENT

/**
 * Verifies a settlement by looking up the transaction hash.
 *
 * @param   {string}  txHash - Transaction hash to verify
 * @returns {Object}  { verified, settlement }
 */
function verifySettlement(txHash) {
    const match = settlementLedger.find(s => s.txHash === txHash);

    if (!match) {
        console.log(`❌ [Facilitator] Settlement not found: ${txHash}`);
        return { verified: false, settlement: null };
    }

    console.log(`🎟️  [Facilitator] Settlement verified: ${txHash}`);
    return { verified: true, settlement: match };
}

// 3. CHALLENGE GENERATION (Server-Side)

/**
 * Generates a settlement challenge that the provider sends back
 * with the HTTP 402 response.
 *
 * @param   {Object}  params
 * @param   {number}  params.cost        - Required payment amount
 * @param   {string}  params.serviceName - Provider service name
 * @param   {string}  [params.recipient] - Provider wallet address
 * @returns {Object}  challenge payload
 */
function generateChallenge({ cost, serviceName, recipient = 'ALGO_PROVIDER_ESCROW_TESTNET' }) {
    return {
        statusCode: 402,
        protocol: 'x402',
        version: '1.0',
        service: serviceName,
        challenge: {
            amount: cost,
            currency: 'USDC',
            assetId: algorandConfig.ASSETS.USDC,
            network: 'algorand-testnet',
            recipient,
            facilitatorUrl: x402Config.FACILITATOR_URL,
            endpoints: x402Config.ENDPOINTS,
            memo: `x402_challenge_${Date.now()}`,
            expiresIn: x402Config.TIMEOUT_MS,
            issuedAt: new Date().toISOString()
        }
    };
}

// 4. LEDGER QUERIES

/**
 * Returns the settlement ledger.
 */
function getSettlementLedger(limit = 50) {
    return [...settlementLedger].reverse().slice(0, limit);
}

/**
 * Returns aggregate facilitator stats.
 */
function getFacilitatorStats() {
    const totalVolume = settlementLedger.reduce((s, e) => s + e.amount, 0);
    const avgLatency = settlementLedger.length > 0
        ? settlementLedger.reduce((s, e) => s + e.latencyMs, 0) / settlementLedger.length
        : 0;

    return {
        totalSettlements: settlementLedger.length,
        totalVolume: Number(totalVolume.toFixed(4)),
        avgLatencyMs: Math.round(avgLatency),
        currency: 'USDC',
        network: 'algorand-testnet',
        facilitatorUrl: x402Config.FACILITATOR_URL
    };
}

// INTERNAL

function _validateSettlementRequest(amount, recipient) {
    if (!amount || amount <= 0) {
        throw new Error('Settlement amount must be a positive number.');
    }
    if (!recipient) {
        throw new Error('Recipient address is required for settlement.');
    }
    if (amount > 100) {
        throw new Error(`Settlement amount $${amount} exceeds maximum safety limit.`);
    }
}

// EXPORTS
module.exports = {
    settle,
    verifySettlement,
    generateChallenge,
    getSettlementLedger,
    getFacilitatorStats
};
