/**
 * TrustChain: Transaction Model
 * Represents an on-chain ledger record. Broader than just Payments (includes ASA opt-ins, etc).
 */

class Transaction {
    constructor(data) {
        this.txHash = data.txHash; // Primary key
        this.type = data.type; // 'pay' | 'axfer' | 'group'
        this.fromAddress = data.fromAddress;
        this.toAddress = data.toAddress;
        this.amount = data.amount;
        this.assetId = data.assetId || 0; // 0 = ALGO
        this.status = data.status || 'pending'; // 'pending' | 'confirmed' | 'failed'
        this.confirmedRound = data.confirmedRound || null;
        this.timestamp = data.timestamp || new Date().toISOString();
    }
}

module.exports = Transaction;
