const x402Config = require('../config/x402');

/**
 * TrustChain: x402 payment gatekeeper middleware
 * protects premium API routes by enforcing the HTTP 402 payment required flow.
 * @param {Object} options
 * @param {number} options.cost - price in USDC (e.g., 0.002)
 * @param {string} options.serviceName - Name of the protected service
 * @param {string} options.recipient - algorand address receiving the settlement
 */
const requireX402Payment = (options = {}) => {
    const cost = options.cost || 0.001;
    const serviceName = options.serviceName || "Premium API Service";
    const recipient = options.recipient || "ALGO_PROVIDER_ESCROW_TESTNET";

    return (req, res, next) => {
        // 1. inspect request headers for proof of payment
        const receiptHeader = req.headers[x402Config.HEADERS.PAYMENT_RECEIPT.toLowerCase()] ||
            req.headers['x-402-receipt'];

        // Case A: No receipt provided -> challenge with HTTP 402
        if (!receiptHeader) {
            console.log(`\n💳 [x402 Gatekeeper] Intercepted call to "${req.originalUrl}"`);
            console.log(`🔒 [x402 Gatekeeper] No receipt found. Issuing HTTP 402 Payment Challenge...`);

            // attach standard protocol headers
            res.setHeader(x402Config.HEADERS.PAYMENT_REQUIRED, 'true');
            res.setHeader(x402Config.HEADERS.PAYMENT_OPTIONS, JSON.stringify({
                asset: 'USDC',
                network: x402Config.NETWORK,
                amount: cost,
                recipient: recipient
            }));

            // return HTTP 402 payment required
            return res.status(x402Config.STATUS.PAYMENT_REQUIRED).json({
                error: "Payment Required",
                statusCode: 402,
                protocol: "x402",
                service: serviceName,
                challenge: {
                    amount: cost,
                    currency: "USDC",
                    network: "algorand-testnet",
                    recipient: recipient,
                    facilitatorUrl: x402Config.FACILITATOR_URL,
                    memo: `x402_req_${Date.now()}`
                },
                instructions: "Sign transaction via x402 facilitator and resubmit request with the 'x-402-receipt' header."
            });
        }

        // Case B: Payment receipt provided -> verify and allow access
        console.log(`\n🎟️  [x402 Gatekeeper] Receipt detected: ${receiptHeader}`);
        console.log(`✅ [x402 Gatekeeper] Payment verified for ${serviceName}. Unlocking data access.`);

        // attach payment metadata to the request so subsequent controllers can log it
        req.x402Payment = {
            receipt: receiptHeader,
            verified: true,
            amount: cost,
            service: serviceName,
            settledAt: new Date().toISOString()
        };

        // open the way to routes
        next();
    };
};

module.exports = {
    requireX402Payment
};