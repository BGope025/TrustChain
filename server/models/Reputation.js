/**
 * TrustChain: Reputation Model
 * Represents the trust score and historical metrics for a specific Service.
 */

class Reputation {
    constructor(data) {
        this.serviceId = data.serviceId; // Primary key, references Service.id
        this.trustScore = data.trustScore !== undefined ? data.trustScore : 50.0;
        this.successfulCalls = data.successfulCalls || 0;
        this.failedCalls = data.failedCalls || 0;
        this.disputes = data.disputes || 0;
        this.averageLatencyMs = data.averageLatencyMs || 500;
        this.grade = data.grade || 'C';
        this.lastCalculatedAt = data.lastCalculatedAt || new Date().toISOString();
    }
}

module.exports = Reputation;
