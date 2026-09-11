/**
 * TrustChain: WebSocket Emitters
 * Helper functions to emit typed events to specific channels,
 * ensuring consistent payload structures.
 */

const { getIO } = require('./socket.server');
const CHANNELS = require('./channels');

/**
 * Broadcasts an agent lifecycle event.
 * @param {string} eventName - e.g. 'planning', 'executing'
 * @param {Object} payload 
 */
function emitAgentEvent(eventName, payload) {
    try {
        const io = getIO();
        io.to(CHANNELS.AGENT_LIFECYCLE).emit(`agent:${eventName}`, {
            timestamp: new Date().toISOString(),
            ...payload
        });
    } catch (e) {
        // Suppress if io isn't initialized yet
    }
}

/**
 * Broadcasts a payment settlement or failure.
 * @param {string} status - e.g. 'settled', 'failed', 'denied'
 * @param {Object} payload 
 */
function emitPaymentEvent(status, payload) {
    try {
        const io = getIO();
        io.to(CHANNELS.PAYMENTS).emit(`payment:${status}`, {
            timestamp: new Date().toISOString(),
            ...payload
        });
    } catch (e) {
        // Suppress
    }
}

/**
 * Broadcasts a global system alert.
 * @param {string} alertType - e.g. 'budget_warning', 'fraud_detected'
 * @param {Object} payload 
 */
function emitAlert(alertType, payload) {
    try {
        const io = getIO();
        io.to(CHANNELS.ALERTS).emit('alert', {
            type: alertType,
            timestamp: new Date().toISOString(),
            ...payload
        });
    } catch (e) {
        // Suppress
    }
}

module.exports = {
    emitAgentEvent,
    emitPaymentEvent,
    emitAlert
};
