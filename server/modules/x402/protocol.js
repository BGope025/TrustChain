const x402Config = require('../../config/x402');
const algorandConfig = require('../../config/algorand');

/**
 * ASB-Pay: x402 Protocol Specification
 * Defines the HTTP headers, challenge/response format, and protocol
 * constants used in the x402 Payment Required flow.
 *
 * Reference: HTTP 402 Payment Required
 * Extension: x402 protocol for machine-to-machine micro-payments
 */

// PROTOCOL VERSION
const PROTOCOL_VERSION = '1.0';
const PROTOCOL_NAME    = 'x402';

// 1. HTTP HEADERS

/** Header names used in the x402 flow. */
const HEADERS = {
    // ── Sent by the server (402 response) 
    PAYMENT_REQUIRED:  x402Config.HEADERS.PAYMENT_REQUIRED,   // 'x-402-payment-required'
    PAYMENT_OPTIONS:   x402Config.HEADERS.PAYMENT_OPTIONS,    // 'x-402-payment-options'

    // ── Sent by the client (retry with receipt) 
    PAYMENT_RECEIPT:   x402Config.HEADERS.PAYMENT_RECEIPT,    // 'x-402-receipt'
    PAYMENT_TOKEN:     x402Config.HEADERS.PAYMENT_TOKEN,      // 'x-402-token'

    // ── Optional metadata headers 
    PAYMENT_NETWORK:   'x-402-network',
    PAYMENT_ASSET:     'x-402-asset',
    PAYMENT_AMOUNT:    'x-402-amount',
    PAYMENT_VERSION:   'x-402-version'
};

// 2. BUILD CHALLENGE (server-side)

/**
 * Constructs the full 402 challenge payload that the server returns
 * when payment is required.
 *
 * @param   {Object}  options
 * @param   {number}  options.cost        - Price in USDC
 * @param   {string}  options.serviceName - Protected service name
 * @param   {string}  [options.recipient] - Provider's Algorand address
 * @returns {Object}  Challenge payload (goes in HTTP body)
 */
function buildChallenge({ cost, serviceName, recipient = 'ALGO_PROVIDER_ESCROW_TESTNET' }) {
    return {
        error: 'Payment Required',
        statusCode: 402,
        protocol: PROTOCOL_NAME,
        version: PROTOCOL_VERSION,
        service: serviceName,
        challenge: {
            amount: cost,
            currency: 'USDC',
            assetId: algorandConfig.ASSETS.USDC,
            network: x402Config.NETWORK,
            recipient,
            facilitatorUrl: x402Config.FACILITATOR_URL,
            endpoints: x402Config.ENDPOINTS,
            memo: `x402_req_${Date.now()}`,
            expiresIn: x402Config.TIMEOUT_MS
        },
        instructions: "Sign transaction via x402 facilitator and resubmit " +
                      "request with the 'x-402-receipt' header."
    };
}

/**
 * Builds the HTTP response headers for a 402 challenge.
 *
 * @param   {number}  cost      - Price in USDC
 * @param   {string}  recipient - Provider address
 * @returns {Object}  Headers to set on the 402 response
 */
function buildChallengeHeaders(cost, recipient = 'ALGO_PROVIDER_ESCROW_TESTNET') {
    return {
        [HEADERS.PAYMENT_REQUIRED]: 'true',
        [HEADERS.PAYMENT_OPTIONS]: JSON.stringify({
            asset: 'USDC',
            network: x402Config.NETWORK,
            amount: cost,
            recipient
        }),
        [HEADERS.PAYMENT_VERSION]: PROTOCOL_VERSION,
        [HEADERS.PAYMENT_NETWORK]: 'algorand-testnet',
        [HEADERS.PAYMENT_AMOUNT]: String(cost)
    };
}

// 3. PARSE CHALLENGE (client-side)

/**
 * Parses a 402 challenge response into structured data.
 *
 * @param   {Object}  challengeBody - The JSON body from the 402 response
 * @returns {Object}  Parsed challenge fields
 */
function parseChallenge(challengeBody) {
    const c = challengeBody.challenge || challengeBody;

    return {
        protocol: challengeBody.protocol || PROTOCOL_NAME,
        version: challengeBody.version || PROTOCOL_VERSION,
        service: challengeBody.service || 'Unknown',
        amount: c.amount || 0,
        currency: c.currency || 'USDC',
        assetId: c.assetId || algorandConfig.ASSETS.USDC,
        network: c.network || 'algorand-testnet',
        recipient: c.recipient || '',
        facilitatorUrl: c.facilitatorUrl || x402Config.FACILITATOR_URL,
        memo: c.memo || '',
        expiresIn: c.expiresIn || x402Config.TIMEOUT_MS
    };
}

// 4. BUILD RECEIPT HEADERS (client-side)

/**
 * Builds the HTTP headers to include when retrying a request
 * after payment settlement.
 *
 * @param   {string}  receiptToken - The x402 receipt token
 * @returns {Object}  Headers to include on the retry request
 */
function buildReceiptHeaders(receiptToken) {
    return {
        [HEADERS.PAYMENT_RECEIPT]: receiptToken,
        [HEADERS.PAYMENT_TOKEN]: receiptToken,
        [HEADERS.PAYMENT_VERSION]: PROTOCOL_VERSION
    };
}

// 5. DETECTION HELPERS

/**
 * Checks if a response is a 402 payment challenge.
 *
 * @param   {Object}  headers    - HTTP response headers
 * @param   {number}  statusCode - HTTP status code
 * @returns {Object}  { isChallenge, paymentOptions }
 */
function isPaymentRequired(headers, statusCode) {
    const isChallenge = statusCode === 402 ||
        headers[HEADERS.PAYMENT_REQUIRED] === 'true' ||
        headers[HEADERS.PAYMENT_REQUIRED.toLowerCase()] === 'true';

    let paymentOptions = null;
    const optionsHeader = headers[HEADERS.PAYMENT_OPTIONS] ||
                          headers[HEADERS.PAYMENT_OPTIONS.toLowerCase()];

    if (optionsHeader) {
        try {
            paymentOptions = JSON.parse(optionsHeader);
        } catch (e) {
            paymentOptions = { raw: optionsHeader };
        }
    }

    return { isChallenge, paymentOptions };
}

/**
 * Checks if a request has a valid receipt header.
 *
 * @param   {Object}  headers - HTTP request headers
 * @returns {Object}  { hasReceipt, receiptToken }
 */
function hasReceiptHeader(headers) {
    const token = headers[HEADERS.PAYMENT_RECEIPT] ||
                  headers[HEADERS.PAYMENT_RECEIPT.toLowerCase()] ||
                  headers['x-402-receipt'];

    return {
        hasReceipt: !!token,
        receiptToken: token || null
    };
}

// 6. PROTOCOL METADATA

/**
 * Returns the full protocol specification metadata.
 */
function getProtocolSpec() {
    return {
        name: PROTOCOL_NAME,
        version: PROTOCOL_VERSION,
        headers: { ...HEADERS },
        statusCodes: x402Config.STATUS,
        network: x402Config.NETWORK,
        supportedAssets: ['USDC'],
        facilitatorUrl: x402Config.FACILITATOR_URL,
        endpoints: x402Config.ENDPOINTS,
        timeoutMs: x402Config.TIMEOUT_MS
    };
}

// EXPORTS
module.exports = {
    HEADERS,
    PROTOCOL_VERSION,
    PROTOCOL_NAME,
    buildChallenge,
    buildChallengeHeaders,
    parseChallenge,
    buildReceiptHeaders,
    isPaymentRequired,
    hasReceiptHeader,
    getProtocolSpec
};
