/**
 * TrustChain: WebSocket Channels
 * Defines the standard channel names used for client subscriptions
 * and server broadcasts.
 */

const CHANNELS = Object.freeze({
    AGENT_LIFECYCLE: 'agent:lifecycle',     // Plan, route, execute phases
    PAYMENTS:        'payments:feed',       // x402 settlement events
    TRUST_UPDATES:   'trust:updates',       // Reputation score changes
    SYSTEM_LOGS:     'system:logs',         // Throughput and error logs
    ALERTS:          'alerts:global'        // Budget warnings, fraud detection
});

module.exports = CHANNELS;
