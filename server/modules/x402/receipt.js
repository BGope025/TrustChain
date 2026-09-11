const crypto = require('crypto');

/**
 * TrustChain: x402 Receipt Generator
 * Generates and verifies cryptographic receipts that prove a payment
 * was settled on the Algorand blockchain.
 *
 * Receipt format:
 *   x402_rcpt_{base64(txHash:amount:timestamp:signature)}
 *
 * In production the signature would be an ed25519 signature over the
 * receipt payload. For the hackathon we use HMAC-SHA256 with a shared secret.
 */

// SECRET KEY (in production: from env / KMS)
const HMAC_SECRET = 'asb-pay-x402-receipt-secret-2026';

// RECEIPT STORE
const receiptStore = new Map();   // token → receipt data
const MAX_RECEIPTS = 1000;

// 1. GENERATE RECEIPT

/**
 * Generates a cryptographic receipt proving a payment was made.
 *
 * @param   {Object}  params
 * @param   {string}  params.txHash      - Algorand transaction hash
 * @param   {number}  params.amount      - USDC amount settled
 * @param   {string}  params.serviceId   - Target service
 * @param   {string}  params.serviceName - Human-readable name
 * @returns {Object}  { token, txHash, amount, signature, issuedAt, expiresAt }
 */
function generate({ txHash, amount, serviceId, serviceName }) {
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    // Build the receipt payload
    const payload = `${txHash}:${amount}:${serviceId}:${issuedAt}`;

    // Sign with HMAC-SHA256
    const signature = crypto
        .createHmac('sha256', HMAC_SECRET)
        .update(payload)
        .digest('hex')
        .substring(0, 32);

    // Build the token
    const tokenData = Buffer.from(`${txHash}:${amount}:${signature}`).toString('base64');
    const token = `x402_rcpt_${tokenData}`;

    const receiptData = {
        token,
        txHash,
        amount,
        currency: 'USDC',
        serviceId,
        serviceName,
        signature,
        issuedAt,
        expiresAt,
        verified: false
    };

    // Store
    receiptStore.set(token, receiptData);
    _enforceMaxSize();

    console.log(`🎟️  [Receipt] Generated for ${serviceName}: ${token.substring(0, 30)}...`);

    return receiptData;
}

// 2. VERIFY RECEIPT

/**
 * Verifies a receipt token is authentic and not expired.
 *
 * @param   {string}  token - The x402 receipt token
 * @returns {Object}  { valid, receipt, reason }
 */
function verify(token) {
    // ── Check store 
    const stored = receiptStore.get(token);

    if (!stored) {
        return { valid: false, receipt: null, reason: 'Receipt not found in store.' };
    }

    // ── Check expiry 
    if (new Date(stored.expiresAt) < new Date()) {
        return { valid: false, receipt: stored, reason: 'Receipt has expired.' };
    }

    // ── Re-verify signature 
    const payload = `${stored.txHash}:${stored.amount}:${stored.serviceId}:${stored.issuedAt}`;
    const expectedSig = crypto
        .createHmac('sha256', HMAC_SECRET)
        .update(payload)
        .digest('hex')
        .substring(0, 32);

    if (expectedSig !== stored.signature) {
        return { valid: false, receipt: stored, reason: 'Signature verification failed.' };
    }

    // ── Mark as verified 
    stored.verified = true;
    stored.verifiedAt = new Date().toISOString();

    console.log(`✅ [Receipt] Verified: ${token.substring(0, 30)}...`);

    return { valid: true, receipt: stored, reason: 'Receipt is valid and authentic.' };
}

// 3. DECODE RECEIPT TOKEN

/**
 * Decodes a receipt token to extract embedded data.
 *
 * @param   {string}  token
 * @returns {Object}  { txHash, amount, signature } or null
 */
function decode(token) {
    try {
        const base64Part = token.replace('x402_rcpt_', '');
        const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
        const [txHash, amount, signature] = decoded.split(':');

        return {
            txHash,
            amount: Number(amount),
            signature,
            decoded: true
        };
    } catch (error) {
        return { decoded: false, error: error.message };
    }
}

// 4. REVOKE RECEIPT

/**
 * Revokes a receipt (e.g. due to dispute or fraud).
 *
 * @param   {string}  token
 * @returns {boolean} true if found and revoked
 */
function revoke(token) {
    const stored = receiptStore.get(token);
    if (!stored) return false;

    stored.revoked = true;
    stored.revokedAt = new Date().toISOString();

    console.log(`🚫 [Receipt] Revoked: ${token.substring(0, 30)}...`);
    return true;
}

// 5. RECEIPT QUERIES

/**
 * Returns a receipt by its token.
 */
function getByToken(token) {
    return receiptStore.get(token) || null;
}

/**
 * Returns all receipts for a given service.
 */
function getByService(serviceId, limit = 50) {
    return Array.from(receiptStore.values())
        .filter(r => r.serviceId === serviceId)
        .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
        .slice(0, limit);
}

/**
 * Returns aggregate receipt stats.
 */
function getStats() {
    const all = Array.from(receiptStore.values());
    const verified = all.filter(r => r.verified).length;
    const expired = all.filter(r => new Date(r.expiresAt) < new Date()).length;
    const revoked = all.filter(r => r.revoked).length;
    const totalVolume = all.reduce((s, r) => s + r.amount, 0);

    return {
        total: all.length,
        verified,
        expired,
        revoked,
        active: all.length - expired - revoked,
        totalVolume: Number(totalVolume.toFixed(4)),
        currency: 'USDC'
    };
}

// INTERNAL

function _enforceMaxSize() {
    if (receiptStore.size > MAX_RECEIPTS) {
        const firstKey = receiptStore.keys().next().value;
        receiptStore.delete(firstKey);
    }
}

// EXPORTS
module.exports = {
    generate,
    verify,
    decode,
    revoke,
    getByToken,
    getByService,
    getStats
};
