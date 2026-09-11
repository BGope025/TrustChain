const protocol = require('./protocol');
const facilitator = require('./facilitator');
const receipt = require('./receipt');

/**
 * TrustChain: x402 Client
 * Initiates x402 micro-payment flows from the AI agent's perspective.
 * This is the client-side counterpart to the x402 middleware on the
 * provider's server.
 *
 * Flow:
 *   1. Agent calls a paid API → receives HTTP 402 + challenge
 *   2. Agent parses the challenge headers
 *   3. Agent settles payment via the facilitator
 *   4. Agent re-sends the original request with the receipt header
 */

// REQUEST HISTORY
const requestLog = [];
const MAX_LOG = 200;

// 1. MAKE PAID REQUEST

/**
 * Executes a full x402 payment flow for a given API endpoint.
 *
 * @param   {Object}  options
 * @param   {string}  options.url          - The paid API endpoint
 * @param   {string}  options.method       - HTTP method (GET, POST, etc.)
 * @param   {Object}  [options.headers]    - Additional request headers
 * @param   {Object}  [options.body]       - Request body (for POST/PUT)
 * @param   {string}  options.serviceId    - Marketplace service ID
 * @param   {string}  options.serviceName  - Human-readable service name
 * @returns {Object}  { success, data, receipt, cost, latencyMs }
 */
async function makePaidRequest(options) {
    const {
        url,
        method = 'GET',
        headers = {},
        body = null,
        serviceId,
        serviceName
    } = options;

    const startTime = Date.now();

    console.log(`\n🌐 [x402 Client] Initiating paid request: ${method} ${url}`);

    try {
        // ── Step 1: Attempt the request (will receive HTTP 402) ──
        console.log(`📤 [x402 Client] Sending initial request (expecting 402)...`);

        // Simulate the 402 challenge response
        const challenge = protocol.buildChallenge({
            cost: 0.002, // Will be overridden by actual challenge headers
            serviceName,
            recipient: 'ALGO_PROVIDER_ESCROW_TESTNET'
        });

        // ── Step 2: Parse the challenge 
        const parsedChallenge = protocol.parseChallenge(challenge);
        console.log(
            `📋 [x402 Client] Challenge received — ` +
            `Amount: $${parsedChallenge.amount} ${parsedChallenge.currency}`
        );

        // ── Step 3: Settle via facilitator 
        console.log(`💳 [x402 Client] Settling payment via facilitator...`);
        const settlement = await facilitator.settle({
            amount: parsedChallenge.amount,
            recipient: parsedChallenge.recipient,
            serviceId,
            memo: `x402_${serviceId}_${Date.now()}`
        });

        // ── Step 4: Generate receipt 
        const paymentReceipt = receipt.generate({
            txHash: settlement.txHash,
            amount: parsedChallenge.amount,
            serviceId,
            serviceName
        });

        // ── Step 5: Re-send with receipt header 
        const receiptHeaders = protocol.buildReceiptHeaders(paymentReceipt.token);
        console.log(`📤 [x402 Client] Re-sending request with receipt: ${paymentReceipt.token}`);

        // Simulate successful response
        await new Promise(r => setTimeout(r, 200));

        const latencyMs = Date.now() - startTime;

        // ── Log the request 
        const logEntry = {
            url,
            method,
            serviceId,
            serviceName,
            cost: parsedChallenge.amount,
            txHash: settlement.txHash,
            receiptToken: paymentReceipt.token,
            latencyMs,
            success: true,
            timestamp: new Date().toISOString()
        };
        _log(logEntry);

        console.log(`✅ [x402 Client] Paid request complete — ${latencyMs}ms, $${parsedChallenge.amount} USDC`);

        return {
            success: true,
            data: { status: 'ok', source: serviceName },
            receipt: paymentReceipt,
            settlement,
            cost: parsedChallenge.amount,
            latencyMs
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;

        _log({
            url, method, serviceId, serviceName,
            cost: 0, txHash: null, receiptToken: null,
            latencyMs, success: false, error: error.message,
            timestamp: new Date().toISOString()
        });

        console.error(`🚨 [x402 Client] Paid request failed:`, error.message);
        throw error;
    }
}

// 2. CHECK IF RESPONSE IS A 402 CHALLENGE

/**
 * Inspects response headers to determine if it's a 402 challenge.
 *
 * @param   {Object}  responseHeaders - HTTP response headers
 * @param   {number}  statusCode      - HTTP status code
 * @returns {Object}  { isChallenge, challenge }
 */
function isPaymentChallenge(responseHeaders, statusCode) {
    return protocol.isPaymentRequired(responseHeaders, statusCode);
}

// 3. REQUEST LOG

/**
 * Returns the recent x402 request log.
 */
function getRequestLog(limit = 50) {
    return requestLog.slice(-limit).reverse();
}

/**
 * Returns aggregate stats from the request log.
 */
function getClientStats() {
    const successful = requestLog.filter(r => r.success);
    const failed = requestLog.filter(r => !r.success);
    const totalCost = successful.reduce((s, r) => s + (r.cost || 0), 0);
    const avgLatency = successful.length > 0
        ? successful.reduce((s, r) => s + r.latencyMs, 0) / successful.length
        : 0;

    return {
        totalRequests: requestLog.length,
        successful: successful.length,
        failed: failed.length,
        totalCost: Number(totalCost.toFixed(4)),
        avgLatencyMs: Math.round(avgLatency),
        currency: 'USDC'
    };
}

// INTERNAL

function _log(entry) {
    requestLog.push(entry);
    if (requestLog.length > MAX_LOG) requestLog.shift();
}

// EXPORTS
module.exports = {
    makePaidRequest,
    isPaymentChallenge,
    getRequestLog,
    getClientStats
};
