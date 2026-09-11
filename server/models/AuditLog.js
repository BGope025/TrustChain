/**
 * TrustChain: AuditLog Model
 * Represents an immutable log entry for system actions, policy violations, etc.
 */

class AuditLog {
    constructor(data) {
        this.id = data.id || `log_${Date.now()}`;
        this.category = data.category; // 'security' | 'policy' | 'system'
        this.action = data.action;
        this.actorId = data.actorId || 'system';
        this.details = data.details || {}; // JSON payload
        this.timestamp = data.timestamp || new Date().toISOString();
    }
}

module.exports = AuditLog;
