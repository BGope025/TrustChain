const env = require('./env');

/**
 * TrustChain: x402 Protocol Configuration
 * This file defines the standard endpoints, headers, and protocol rules 
 * for the HTTP 402 (Payment Required) flow on Algorand.
 */

const x402Config = {
    // "Facilitator endpoint"
    // The trusted nodes that verify the payment on the blockchain 
    // before unlocking the API data.
    FACILITATOR_URL: env.X402_FACILITATOR_URL || 'https://testnet.x402.org',
    ENDPOINTS: {
        REQUEST_CHALLENGE: '/api/v1/challenge',
        SETTLE_PAYMENT: '/api/v1/settle',
        VERIFY_RECEIPT: '/api/v1/verify'
    },

    // "Protocol headers"
    // The exact HTTP headers your mock APIs will look for (or send back)
    // to trigger the payment flow.
    HEADERS: {
        // Sent by the Server when payment is needed
        PAYMENT_REQUIRED: 'x-402-payment-required',
        PAYMENT_OPTIONS: 'x-402-payment-options',

        // Sent by the Agent to prove they paid
        PAYMENT_RECEIPT: 'x-402-receipt',
        PAYMENT_TOKEN: 'x-402-token'
    },

    // "Settlement parameters"
    NETWORK: 'algorand',
    SUPPORTED_ASSET_ID: 10458941, // Mock USDC Asset ID on Algorand Testnet
    TIMEOUT_MS: 5000,             // Max time to wait for a blockchain settlement

    // "HTTP ststus code"
    STATUS: {
        PAYMENT_REQUIRED: 402,
        OK: 200,
        UNAUTHORIZED: 401,
        PAYMENT_TIMEOUT: 408
    }
};

module.exports = x402Config;