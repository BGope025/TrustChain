const calculator = require('./calculator');

/**
 * TrustChain: Reputation Sync
 * Maintains a local reputation cache and periodically syncs it with
 * on-chain state (Algorand note fields / app state).
 *
 * In production this would read from the Algorand Indexer to pull
 * on-chain reputation records. For the hackathon MVP we simulate
 * the sync cycle with in-memory state.
 *
 * Sync Modes:
 *   - PULL:  Fetch on-chain data → update local cache
 *   - PUSH:  Write local updates → commit to chain
 *   - FULL:  Pull + recalculate + push
 */

// LOCAL REPUTATION CACHE
const reputationCache = new Map();

// Sync metadata
const syncState = {
    lastPullAt: null,
    lastPushAt: null,
    lastFullSyncAt: null,
    pullCount: 0,
    pushCount: 0,
    conflicts: 0,
    status: 'idle'   // idle | pulling | pushing | syncing | error
};

// 1. PULL FROM CHAIN

/**
 * Simulates pulling reputation data from the Algorand blockchain
 * and merging it into the local cache.
 *
 * @param   {Array}   serviceIds - Service IDs to pull (empty = all)
 * @returns {Object}  { pulled, updated, conflicts }
 */
async function pull(serviceIds = []) {
    syncState.status = 'pulling';
    console.log(`\n⬇️  [Reputation Sync] Pulling on-chain reputation data...`);

    // Simulate network latency
    await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

    // Mock on-chain data (in production: query Algorand Indexer)
    const onChainData = _getMockOnChainData();
    const targetIds = serviceIds.length > 0
        ? serviceIds
        : Object.keys(onChainData);

    let updated = 0;
    let conflicts = 0;

    for (const id of targetIds) {
        const chainRecord = onChainData[id];
        if (!chainRecord) continue;

        const localRecord = reputationCache.get(id);

        if (!localRecord) {
            // New record — insert directly
            reputationCache.set(id, { ...chainRecord, source: 'chain', syncedAt: new Date().toISOString() });
            updated++;
        } else {
            // Existing record — check for conflicts
            if (chainRecord.trustScore !== localRecord.trustScore) {
                // Conflict resolution: chain wins (authoritative source)
                reputationCache.set(id, {
                    ...chainRecord,
                    previousLocal: localRecord.trustScore,
                    source: 'chain_override',
                    syncedAt: new Date().toISOString()
                });
                conflicts++;
                updated++;
            }
        }
    }

    syncState.lastPullAt = new Date().toISOString();
    syncState.pullCount++;
    syncState.conflicts += conflicts;
    syncState.status = 'idle';

    console.log(`✅ [Reputation Sync] Pull complete — ${updated} updated, ${conflicts} conflicts resolved`);

    return { pulled: targetIds.length, updated, conflicts };
}

// 2. PUSH TO CHAIN

/**
 * Simulates pushing local reputation updates to the Algorand blockchain.
 *
 * @param   {Array}   serviceIds - Service IDs to push
 * @returns {Object}  { pushed, txHashes }
 */
async function push(serviceIds = []) {
    syncState.status = 'pushing';
    console.log(`\n⬆️  [Reputation Sync] Pushing local reputation to chain...`);

    const targetIds = serviceIds.length > 0
        ? serviceIds
        : Array.from(reputationCache.keys());

    const txHashes = [];

    for (const id of targetIds) {
        const record = reputationCache.get(id);
        if (!record) continue;

        // Simulate blockchain write
        await new Promise(r => setTimeout(r, 100));
        const txHash = `TX_REP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        txHashes.push({ serviceId: id, txHash });

        // Mark as synced
        record.lastPushedAt = new Date().toISOString();
        record.pushTxHash = txHash;
    }

    syncState.lastPushAt = new Date().toISOString();
    syncState.pushCount++;
    syncState.status = 'idle';

    console.log(`✅ [Reputation Sync] Pushed ${txHashes.length} records to chain`);

    return { pushed: txHashes.length, txHashes };
}

// 3. FULL SYNC (PULL + RECALCULATE + PUSH)

/**
 * Performs a complete sync cycle: pull from chain, recalculate scores
 * with the trust calculator, then push updated scores back.
 *
 * @returns {Object} Full sync report
 */
async function fullSync() {
    syncState.status = 'syncing';
    console.log(`\n🔄 [Reputation Sync] Starting full sync cycle...`);

    // Step 1: Pull
    const pullResult = await pull();

    // Step 2: Recalculate all cached scores
    let recalculated = 0;
    for (const [id, record] of reputationCache) {
        const newCalc = calculator.calculate(record);
        record.trustScore = newCalc.compositeScore;
        record.grade = newCalc.grade;
        record.components = newCalc.components;
        recalculated++;
    }

    // Step 3: Push
    const pushResult = await push();

    syncState.lastFullSyncAt = new Date().toISOString();
    syncState.status = 'idle';

    console.log(`✅ [Reputation Sync] Full sync complete`);

    return {
        pulled: pullResult.pulled,
        recalculated,
        pushed: pushResult.pushed,
        conflicts: pullResult.conflicts,
        syncedAt: syncState.lastFullSyncAt
    };
}

// 4. CACHE ACCESS

/**
 * Gets a cached reputation record by service ID.
 */
function getCachedReputation(serviceId) {
    return reputationCache.get(serviceId) || null;
}

/**
 * Updates the local cache with new metrics (without syncing to chain).
 */
function updateLocalCache(serviceId, metrics) {
    const existing = reputationCache.get(serviceId) || {};
    reputationCache.set(serviceId, {
        ...existing,
        ...metrics,
        source: 'local_update',
        updatedAt: new Date().toISOString()
    });
}

/**
 * Returns all cached entries.
 */
function getAllCached() {
    return Array.from(reputationCache.entries()).map(([id, data]) => ({
        serviceId: id,
        ...data
    }));
}

/**
 * Returns sync metadata.
 */
function getSyncState() {
    return { ...syncState, cacheSize: reputationCache.size };
}

// MOCK ON-CHAIN DATA

function _getMockOnChainData() {
    return {
        'srv-market-01': { trustScore: 97.4, successfulCalls: 12482, failedCalls: 103, disputes: 4, averageLatencyMs: 120 },
        'srv-news-01':   { trustScore: 94.1, successfulCalls: 8392,  failedCalls: 210, disputes: 12, averageLatencyMs: 210 },
        'srv-risk-01':   { trustScore: 98.8, successfulCalls: 15930, failedCalls: 45,  disputes: 1,  averageLatencyMs: 315 },
        'srv-vision-01': { trustScore: 82.3, successfulCalls: 3402,  failedCalls: 490, disputes: 35, averageLatencyMs: 450 }
    };
}

// EXPORTS
module.exports = {
    pull,
    push,
    fullSync,
    getCachedReputation,
    updateLocalCache,
    getAllCached,
    getSyncState
};
