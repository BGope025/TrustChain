/**
 * TrustChain: Wallet Model
 * Represents the on-chain wallet metadata for an Agent or Provider.
 */

class Wallet {
    constructor(data) {
        this.address = data.address; // Primary key (Algorand address)
        this.ownerId = data.ownerId; // References Agent.id or Provider.id
        this.ownerType = data.ownerType; // 'agent' | 'provider'
        this.network = data.network || 'testnet';
        this.isFunded = data.isFunded || false;
        this.optedInAssets = data.optedInAssets || [];
        this.createdAt = data.createdAt || new Date().toISOString();
    }
}

module.exports = Wallet;
