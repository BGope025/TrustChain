const { EventEmitter } = require('events');

/**
 * TrustChain: Payment Events
 * A lightweight event bus that emits real-time payment events to any
 * connected listener — primarily the WebSocket feed that powers the
 * live dashboard.
 *
 * Event types:
 *   - payment:initiated   — settlement attempt started
 *   - payment:settled     — blockchain confirmation received
 *   - payment:failed      — settlement error
 *   - payment:denied      — policy engine rejected the payment
 *   - budget:warning      — daily spend approaching limit
 *   - budget:exhausted    — daily limit reached
 */

// EVENT BUS SINGLETON
const paymentBus = new EventEmitter();
paymentBus.setMaxListeners(50);   // Support many WebSocket clients

// EVENT HISTORY (ring buffer)
const EVENT_HISTORY_MAX = 500;
const eventHistory = [];

// EMIT HELPERS

/**
 * Emits a `payment:initiated` event.
 *
 * @param {Object} data — { serviceId, serviceName, amount, provider, taskId }
 */
function emitPaymentInitiated(data) {
    _emit('payment:initiated', {
        ...data,
        status: 'initiated',
        timestamp: new Date().toISOString()
    });
}

/**
 * Emits a `payment:settled` event.
 *
 * @param {Object} data — { serviceId, serviceName, amount, txHash, receiptToken, latencyMs }
 */
function emitPaymentSettled(data) {
    _emit('payment:settled', {
        ...data,
        status: 'settled',
        timestamp: new Date().toISOString()
    });
}

/**
 * Emits a `payment:failed` event.
 *
 * @param {Object} data — { serviceId, serviceName, amount, error }
 */
function emitPaymentFailed(data) {
    _emit('payment:failed', {
        ...data,
        status: 'failed',
        timestamp: new Date().toISOString()
    });
}

/**
 * Emits a `payment:denied` event (policy rejection).
 *
 * @param {Object} data — { amount, reason, code }
 */
function emitPaymentDenied(data) {
    _emit('payment:denied', {
        ...data,
        status: 'denied',
        timestamp: new Date().toISOString()
    });
}

/**
 * Emits a `budget:warning` when daily spend exceeds 80% of the limit.
 *
 * @param {Object} data — { dailySpent, dailyLimit, percentUsed }
 */
function emitBudgetWarning(data) {
    _emit('budget:warning', {
        ...data,
        status: 'warning',
        timestamp: new Date().toISOString()
    });
}

/**
 * Emits a `budget:exhausted` when the daily limit is reached.
 *
 * @param {Object} data — { dailySpent, dailyLimit }
 */
function emitBudgetExhausted(data) {
    _emit('budget:exhausted', {
        ...data,
        status: 'exhausted',
        timestamp: new Date().toISOString()
    });
}

// LISTENER MANAGEMENT

/**
 * Registers a listener for a specific payment event type.
 *
 * @param {string}   eventType - One of the event types listed above
 * @param {Function} handler   - Callback receiving the event data
 */
function on(eventType, handler) {
    paymentBus.on(eventType, handler);
}

/**
 * Registers a one-time listener.
 */
function once(eventType, handler) {
    paymentBus.once(eventType, handler);
}

/**
 * Removes a listener.
 */
function off(eventType, handler) {
    paymentBus.off(eventType, handler);
}

/**
 * Subscribes to ALL payment events (wildcard).
 * Useful for the WebSocket bridge.
 *
 * @param {Function} handler - Receives { type, data }
 * @returns {Function} unsubscribe function
 */
function subscribeAll(handler) {
    const types = [
        'payment:initiated', 'payment:settled', 'payment:failed',
        'payment:denied', 'budget:warning', 'budget:exhausted'
    ];

    const wrappers = types.map(type => {
        const wrapper = (data) => handler({ type, data });
        paymentBus.on(type, wrapper);
        return { type, wrapper };
    });

    // Return unsubscribe function
    return () => {
        for (const { type, wrapper } of wrappers) {
            paymentBus.off(type, wrapper);
        }
    };
}

// EVENT HISTORY

/**
 * Returns the recent event history.
 *
 * @param   {number} [limit=50]
 * @param   {string} [type] - Optional filter by event type
 * @returns {Array}  Recent events, newest first
 */
function getEventHistory(limit = 50, type) {
    let results = [...eventHistory];
    if (type) {
        results = results.filter(e => e.type === type);
    }
    return results.slice(-limit).reverse();
}

/**
 * Returns aggregate event counts by type.
 */
function getEventStats() {
    const counts = {};
    for (const event of eventHistory) {
        counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return {
        total: eventHistory.length,
        byType: counts
    };
}

// INTERNAL

function _emit(type, data) {
    const event = { type, data, emittedAt: new Date().toISOString() };

    // Persist to history
    eventHistory.push(event);
    if (eventHistory.length > EVENT_HISTORY_MAX) {
        eventHistory.shift();
    }

    // Emit on the bus
    paymentBus.emit(type, data);

    console.log(`📡 [Events] ${type} — $${data.amount || 0} ${data.serviceName || ''}`);
}

// EXPORTS
module.exports = {
    emitPaymentInitiated,
    emitPaymentSettled,
    emitPaymentFailed,
    emitPaymentDenied,
    emitBudgetWarning,
    emitBudgetExhausted,
    on,
    once,
    off,
    subscribeAll,
    getEventHistory,
    getEventStats
};
