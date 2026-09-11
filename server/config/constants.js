/**
 * TrustChain: application constants
 * This file acts as the source of truth for the Agent's financial guardrails and trust thresholds.
 */

const POLICIES = {
    // "Agent financial limit" (in USDC)
    MAX_DAILY_SPEND: 5.00,        // agent cannot spend more than $5 a day
    MAX_PER_TX_SPEND: 1.00,       // agent cannot spend more than $1 on a single API call
    AUTO_APPROVE_THRESHOLD: 0.50, // any transaction over $0.50 requires human approval

    // "Trust engine rules"
    MIN_TRUST_SCORE: 85,          // agent will strictly ignore any service with a score lower than 85
    PREFERRED_LATENCY_MS: 300,    // services faster than 300ms get a ranking boost

    // "System constants"
    SUPPORTED_CURRENCY: "USDC",
    NETWORK_ENV: "testnet"
};

// Export these policies so our server.js and AI engine can read them
module.exports = {
    POLICIES
};