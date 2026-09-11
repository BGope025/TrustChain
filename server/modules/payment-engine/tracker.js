/**
 * TrustChain: Balance Tracker
 * Tracks the difference between pending (reserved) and settled (confirmed)
 * balance deductions. This prevents double-spending when multiple agent
 * tasks are executing concurrently.
 *
 * Flow:
 *   1. RESERVE  — locks funds before settlement attempt
 *   2. CONFIRM  — converts reservation to permanent deduction
 *   3. RELEASE  — frees funds if settlement fails
 */

// TRACKER STATE
const trackerState = {
    reservations: new Map(),  // reservationId → { amount, serviceId, createdAt, status }
    totalReserved: 0,
    totalSettled: 0,
    totalReleased: 0
};

// Reservation timeout (auto-release after 30 seconds of no confirmation)
const RESERVATION_TIMEOUT_MS = 30_000;

// 1. RESERVE FUNDS

/**
 * Reserves (locks) a specific amount before settlement.
 * The reserved amount is subtracted from the "available" balance
 * but NOT yet from the actual wallet.
 *
 * @param   {Object}  params
 * @param   {number}  params.amount     - USDC to reserve
 * @param   {string}  params.serviceId  - Associated service
 * @param   {string}  [params.taskId]   - Parent task ID
 * @returns {Object}  reservation — { reservationId, amount, expiresAt }
 */
function reserve({ amount, serviceId, taskId = null }) {
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const reservation = {
        reservationId,
        amount: Number(amount),
        serviceId,
        taskId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + RESERVATION_TIMEOUT_MS).toISOString()
    };

    trackerState.reservations.set(reservationId, reservation);
    trackerState.totalReserved += amount;

    console.log(
        `🔒 [Tracker] Reserved $${amount.toFixed(4)} for ${serviceId} — ` +
        `ID: ${reservationId}`
    );

    // Schedule auto-release
    setTimeout(() => {
        const res = trackerState.reservations.get(reservationId);
        if (res && res.status === 'pending') {
            release(reservationId, 'timeout');
        }
    }, RESERVATION_TIMEOUT_MS);

    return {
        reservationId,
        amount: reservation.amount,
        expiresAt: reservation.expiresAt
    };
}

// 2. CONFIRM SETTLEMENT

/**
 * Converts a pending reservation into a confirmed deduction.
 * Called after successful blockchain settlement.
 *
 * @param   {string} reservationId
 * @param   {string} [txHash] - Settlement transaction hash
 * @returns {Object} { confirmed, amount, txHash }
 * @throws  {Error}  If reservation not found or already resolved
 */
function confirm(reservationId, txHash = null) {
    const res = trackerState.reservations.get(reservationId);

    if (!res) {
        throw new Error(`Reservation ${reservationId} not found.`);
    }
    if (res.status !== 'pending') {
        throw new Error(`Reservation ${reservationId} already ${res.status}.`);
    }

    res.status = 'confirmed';
    res.txHash = txHash;
    res.confirmedAt = new Date().toISOString();

    trackerState.totalSettled += res.amount;

    console.log(
        `✅ [Tracker] Confirmed $${res.amount.toFixed(4)} — ` +
        `Reservation: ${reservationId}, Tx: ${txHash || 'N/A'}`
    );

    return {
        confirmed: true,
        reservationId,
        amount: res.amount,
        txHash,
        serviceId: res.serviceId
    };
}

// 3. RELEASE (CANCEL) RESERVATION

/**
 * Releases a pending reservation, freeing the locked funds.
 * Called when settlement fails or times out.
 *
 * @param   {string} reservationId
 * @param   {string} [reason='manual'] - Reason for release
 * @returns {Object} { released, amount, reason }
 */
function release(reservationId, reason = 'manual') {
    const res = trackerState.reservations.get(reservationId);

    if (!res) {
        console.log(`⚠️  [Tracker] Attempted to release unknown reservation: ${reservationId}`);
        return { released: false, reason: 'not_found' };
    }

    if (res.status !== 'pending') {
        return { released: false, reason: `already_${res.status}` };
    }

    res.status = 'released';
    res.releasedAt = new Date().toISOString();
    res.releaseReason = reason;

    trackerState.totalReleased += res.amount;

    console.log(
        `🔓 [Tracker] Released $${res.amount.toFixed(4)} — ` +
        `Reservation: ${reservationId}, Reason: ${reason}`
    );

    return {
        released: true,
        reservationId,
        amount: res.amount,
        reason,
        serviceId: res.serviceId
    };
}

// 4. BALANCE QUERIES

/**
 * Calculates the effective available balance after accounting
 * for pending reservations.
 *
 * @param   {number} walletBalance - Raw USDC balance from wallet
 * @returns {Object} { walletBalance, pendingReserved, availableBalance }
 */
function getAvailableBalance(walletBalance) {
    const pendingReserved = _getPendingTotal();

    return {
        walletBalance: Number(walletBalance.toFixed(4)),
        pendingReserved: Number(pendingReserved.toFixed(4)),
        availableBalance: Number(Math.max(0, walletBalance - pendingReserved).toFixed(4))
    };
}

/**
 * Returns all reservations, optionally filtered by status.
 *
 * @param   {string} [status] - 'pending' | 'confirmed' | 'released'
 * @returns {Array}  Reservation objects
 */
function getReservations(status) {
    const all = Array.from(trackerState.reservations.values());
    return status ? all.filter(r => r.status === status) : all;
}

/**
 * Returns aggregate tracker statistics.
 */
function getTrackerStats() {
    const pending = _getPendingTotal();
    return {
        totalReserved: Number(trackerState.totalReserved.toFixed(4)),
        totalSettled: Number(trackerState.totalSettled.toFixed(4)),
        totalReleased: Number(trackerState.totalReleased.toFixed(4)),
        currentPending: Number(pending.toFixed(4)),
        activeReservations: getReservations('pending').length
    };
}

// INTERNAL HELPERS

function _getPendingTotal() {
    let total = 0;
    for (const res of trackerState.reservations.values()) {
        if (res.status === 'pending') total += res.amount;
    }
    return total;
}

// EXPORTS
module.exports = {
    reserve,
    confirm,
    release,
    getAvailableBalance,
    getReservations,
    getTrackerStats
};
