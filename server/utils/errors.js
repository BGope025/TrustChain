/**
 * TrustChain: Custom Error Classes
 * Standardized error handling for API and Blockchain interactions.
 */

class ApiError extends Error {
    constructor(statusCode, message, isOperational = true, stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

class BlockchainError extends Error {
    constructor(message, txHash = null, reason = 'unknown') {
        super(message);
        this.name = 'BlockchainError';
        this.txHash = txHash;
        this.reason = reason;
        Error.captureStackTrace(this, this.constructor);
    }
}

class PolicyError extends Error {
    constructor(message, policyCode) {
        super(message);
        this.name = 'PolicyError';
        this.policyCode = policyCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    ApiError,
    BlockchainError,
    PolicyError
};
