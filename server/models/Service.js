/**
 * TrustChain: Service Model
 * Represents a specific API endpoint or capability offered by a Provider.
 */

class Service {
    constructor(data) {
        this.id = data.id || `srv_${Date.now()}`;
        this.providerId = data.providerId; // References Provider.id
        this.name = data.name;
        this.category = data.category; // 'Finance' | 'AI' | 'Media' | etc.
        this.cost = data.cost || 0.0; // USDC cost per call
        this.endpointUrl = data.endpointUrl;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.registeredAt = data.registeredAt || new Date().toISOString();
    }
}

module.exports = Service;
