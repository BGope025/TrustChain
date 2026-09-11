/**
 * TrustChain: Payment Model
 * Represents a single x402 payment settlement attempt.
 */

class Payment {
    constructor(data) {
        this.id = data.id || `pay_${Date.now()}`;
        this.agentId = data.agentId; // The payer
        this.serviceId = data.serviceId; // The payee's service
        this.amount = data.amount; // USDC
        this.status = data.status || 'pending'; // 'pending' | 'settled' | 'failed' | 'denied'
        this.txHash = data.txHash || null; // Algorand tx hash if settled
        this.receiptToken = data.receiptToken || null; // x402 receipt
        this.createdAt = data.createdAt || new Date().toISOString();
        this.settledAt = data.settledAt || null;
    }
}

module.exports = Payment;
