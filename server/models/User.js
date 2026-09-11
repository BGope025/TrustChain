/**
 * TrustChain: User Model
 * Represents a human user interacting with the dashboard.
 */

class User {
    constructor(data) {
        this.id = data.id || `usr_${Date.now()}`;
        this.username = data.username;
        this.email = data.email;
        this.role = data.role || 'user'; // 'user' | 'admin'
        this.createdAt = data.createdAt || new Date().toISOString();
        this.lastLogin = data.lastLogin || null;
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            role: this.role,
            createdAt: this.createdAt
        };
    }
}

module.exports = User;
