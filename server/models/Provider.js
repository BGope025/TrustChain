/**
 * TrustChain: Provider Model
 * Represents a company or entity offering services on the marketplace.
 */

class Provider {
    constructor(data) {
        this.id = data.id || `prov_${Date.now()}`;
        this.name = data.name;
        this.contactEmail = data.contactEmail;
        this.walletAddress = data.walletAddress; // Settlement destination
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.registeredAt = data.registeredAt || new Date().toISOString();
    }
}

module.exports = Provider;
