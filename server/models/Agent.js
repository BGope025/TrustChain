/**
 * TrustChain: Agent Model
 * Represents an autonomous AI agent instance.
 */

class Agent {
    constructor(data) {
        this.id = data.id || `agt_${Date.now()}`;
        this.name = data.name || 'ASB Default Agent';
        this.ownerId = data.ownerId; // References User.id
        this.status = data.status || 'idle'; // 'idle' | 'running' | 'error'
        this.capabilities = data.capabilities || [];
        this.createdAt = data.createdAt || new Date().toISOString();
    }
}

module.exports = Agent;
