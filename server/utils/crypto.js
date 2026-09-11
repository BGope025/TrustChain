/**
 * TrustChain: Crypto Utilities
 * Helpers for encryption, hashing, and signature validation.
 */

const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(env.AGENT_WALLET_MNEMONIC || 'default_secret', 'salt', 32);

/**
 * Encrypts a plain text string.
 * @param {string} text 
 * @returns {string} iv:encrypted_data
 */
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string.
 * @param {string} text (format: iv:encrypted_data)
 * @returns {string} plain text
 */
function decrypt(text) {
    const [ivHex, encryptedText] = text.split(':');
    if (!ivHex || !encryptedText) return null;
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Generates a simple SHA-256 hash.
 */
function hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = {
    encrypt,
    decrypt,
    hash
};
