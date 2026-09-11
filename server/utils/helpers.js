/**
 * TrustChain: Shared Helpers
 * General purpose utility functions.
 */

/**
 * Pauses execution for a given number of milliseconds.
 * Useful for mocking network delays.
 * @param {number} ms 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formats a raw number into a fixed-decimal string (e.g. currency).
 * @param {number} amount 
 * @param {number} decimals 
 */
function formatCurrency(amount, decimals = 4) {
    return Number(amount).toFixed(decimals);
}

/**
 * Safely parses a JSON string, returning a fallback if it fails.
 */
function safeJsonParse(str, fallback = {}) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
}

/**
 * Generates a random alphanumeric ID.
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
}

module.exports = {
    sleep,
    formatCurrency,
    safeJsonParse,
    generateId
};
