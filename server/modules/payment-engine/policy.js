const { POLICIES } = require('../../config/constants');

/**
 * TrustChain: Payment Policy Engine
 * Enforces the financial guard-rails that keep the AI agent's spending
 * within safe bounds. Every payment must pass this gate before settlement.
 *
 * Rules enforced:
 *   1. Per-transaction ceiling  (MAX_PER_TX_SPEND)
 *   2. Daily budget cap         (MAX_DAILY_SPEND)
 *   3. Auto-approve threshold   (AUTO_APPROVE_THRESHOLD)
 *   4. Minimum wallet balance   (must retain ≥ 0.001 ALGO for gas)
 */

// RUNTIME POLICY STATE (live-tunable)
const policyState = {
    dailyLimit:           POLICIES.MAX_DAILY_SPEND,
    maxPerTx:             POLICIES.MAX_PER_TX_SPEND,
    autoApproveThreshold: POLICIES.AUTO_APPROVE_THRESHOLD,
    minGasReserve:        0.001,   // ALGO — minimum gas cushion
    enabled:              true,     // Kill-switch for demo bypass
    overrideMode:         false     // When true, all checks pass (demo only)
};

// Daily spend accumulator
let dailySpent = 0;
let lastResetDay = new Date().toDateString();

// Denied transaction log
const deniedLog = [];

// MAIN ENFORCEMENT

/**
 * Evaluates whether a proposed payment is allowed under current policies.
 *
 * @param   {Object}  payment
 * @param   {number}  payment.amount          - USDC amount
 * @param   {number}  payment.walletBalance   - Current USDC balance
 * @param   {number}  [payment.algoBalance]   - Current ALGO balance (for gas check)
 * @returns {Object}  { allowed, requiresApproval, reason, details }
 */
function evaluate(payment) {
    _resetDailyIfNeeded();

    const { amount, walletBalance, algoBalance = 1 } = payment;

    // ── Override mode (demo bypass) 
    if (policyState.overrideMode) {
        return _allow('Override mode active — all policies bypassed.');
    }

    // ── Kill-switch 
    if (!policyState.enabled) {
        return _deny('POLICY_DISABLED', 'Policy engine is disabled.');
    }

    // ── Rule 1: Per-transaction ceiling 
    if (amount > policyState.maxPerTx) {
        return _deny(
            'MAX_PER_TX',
            `Amount $${amount} exceeds per-transaction limit of $${policyState.maxPerTx}.`
        );
    }

    // ── Rule 2: Daily budget cap 
    const projectedDaily = dailySpent + amount;
    if (projectedDaily > policyState.dailyLimit) {
        return _deny(
            'DAILY_LIMIT',
            `Transaction would push daily spend to $${projectedDaily.toFixed(4)}, ` +
            `exceeding the $${policyState.dailyLimit} daily cap.`
        );
    }

    // ── Rule 3: Sufficient balance 
    if (amount > walletBalance) {
        return _deny(
            'INSUFFICIENT_BALANCE',
            `Insufficient USDC. Have $${walletBalance.toFixed(4)}, need $${amount.toFixed(4)}.`
        );
    }

    // ── Rule 4: Gas reserve 
    if (algoBalance < policyState.minGasReserve) {
        return _deny(
            'LOW_GAS',
            `ALGO balance (${algoBalance}) is below the minimum gas reserve of ${policyState.minGasReserve}.`
        );
    }

    // ── Rule 5: Auto-approve threshold 
    const requiresApproval = amount > policyState.autoApproveThreshold;

    return {
        allowed: true,
        requiresApproval,
        reason: requiresApproval
            ? `Amount $${amount} exceeds auto-approve threshold ($${policyState.autoApproveThreshold}). Human approval required.`
            : 'Payment approved within all policy limits.',
        details: {
            amount,
            dailySpent,
            projectedDaily: Number(projectedDaily.toFixed(4)),
            remainingBudget: Number((policyState.dailyLimit - projectedDaily).toFixed(4))
        }
    };
}

/**
 * Records a confirmed spend against the daily accumulator.
 * Call this AFTER successful settlement only.
 *
 * @param {number} amount - USDC amount settled
 */
function recordSpend(amount) {
    _resetDailyIfNeeded();
    dailySpent += amount;

    console.log(
        `📊 [Policy] Recorded $${amount.toFixed(4)} spend — ` +
        `daily total: $${dailySpent.toFixed(4)} / $${policyState.dailyLimit}`
    );
}

// POLICY MANAGEMENT

/**
 * Returns the current policy state.
 */
function getPolicies() {
    _resetDailyIfNeeded();
    return {
        ...policyState,
        dailySpent: Number(dailySpent.toFixed(4)),
        remainingBudget: Number(Math.max(0, policyState.dailyLimit - dailySpent).toFixed(4)),
        lastResetDay
    };
}

/**
 * Live-updates policy values.
 */
function updatePolicies(updates = {}) {
    if (updates.dailyLimit           !== undefined) policyState.dailyLimit           = Number(updates.dailyLimit);
    if (updates.maxPerTx             !== undefined) policyState.maxPerTx             = Number(updates.maxPerTx);
    if (updates.autoApproveThreshold !== undefined) policyState.autoApproveThreshold = Number(updates.autoApproveThreshold);
    if (updates.enabled              !== undefined) policyState.enabled              = Boolean(updates.enabled);
    if (updates.overrideMode         !== undefined) policyState.overrideMode         = Boolean(updates.overrideMode);

    console.log(`⚙️  [Policy] Updated:`, policyState);
    return getPolicies();
}

/**
 * Returns the denied transaction log.
 */
function getDeniedLog(limit = 50) {
    return deniedLog.slice(-limit);
}

// INTERNAL HELPERS

function _resetDailyIfNeeded() {
    const today = new Date().toDateString();
    if (today !== lastResetDay) {
        dailySpent = 0;
        lastResetDay = today;
        console.log(`🔄 [Policy] Daily spend counter reset.`);
    }
}

function _allow(reason) {
    return { allowed: true, requiresApproval: false, reason, details: {} };
}

function _deny(code, reason) {
    const entry = { code, reason, timestamp: new Date().toISOString() };
    deniedLog.push(entry);
    if (deniedLog.length > 200) deniedLog.shift();

    console.log(`🛑 [Policy] DENIED — ${code}: ${reason}`);
    return { allowed: false, requiresApproval: false, reason, code, details: entry };
}

// EXPORTS
module.exports = {
    evaluate,
    recordSpend,
    getPolicies,
    updatePolicies,
    getDeniedLog
};
