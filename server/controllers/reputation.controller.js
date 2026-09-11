const { POLICIES } = require('../config/constants');

/**
 * TrustChain: Reputation Controller
 * Handles HTTP request/response for the Trust Engine — manages reliability
 * scores, transaction success/fail tracking, and dispute history for
 * marketplace services.
 */

// IN-MEMORY REPUTATION LEDGER
const reputationStore = {
    'srv-market-01': {
        trustScore: 97.4,
        successfulCalls: 12482,
        failedCalls: 103,
        disputes: 4,
        averageLatencyMs: 120,
        lastUpdated: new Date().toISOString()
    },
    'srv-news-01': {
        trustScore: 94.1,
        successfulCalls: 8392,
        failedCalls: 210,
        disputes: 12,
        averageLatencyMs: 210,
        lastUpdated: new Date().toISOString()
    },
    'srv-risk-01': {
        trustScore: 98.8,
        successfulCalls: 15930,
        failedCalls: 45,
        disputes: 1,
        averageLatencyMs: 315,
        lastUpdated: new Date().toISOString()
    },
    'srv-vision-01': {
        trustScore: 82.3,
        successfulCalls: 3402,
        failedCalls: 490,
        disputes: 35,
        averageLatencyMs: 450,
        lastUpdated: new Date().toISOString()
    }
};

// 1. GET PROVIDER REPUTATION
// Handler for: GET /api/reputation/:serviceId
function getReputation(req, res) {
    const { serviceId } = req.params;
    const reputation = reputationStore[serviceId];

    if (!reputation) {
        return res.status(404).json({
            success: false,
            error: 'Reputation data not found for this service ID.'
        });
    }

    console.log(`\n🔎 [Reputation Controller] Agent queried reputation for ${serviceId} (Score: ${reputation.trustScore})`);

    // Determine if the service meets trust threshold
    const meetsTrustThreshold = reputation.trustScore >= POLICIES.MIN_TRUST_SCORE;

    res.json({
        success: true,
        serviceId,
        meetsTrustThreshold,
        minRequiredScore: POLICIES.MIN_TRUST_SCORE,
        metrics: reputation
    });
}

// 2. GET ALL REPUTATIONS (Leaderboard)
// Handler for: GET /api/reputation
function getAllReputations(req, res) {
    const leaderboard = Object.entries(reputationStore)
        .map(([id, metrics]) => ({
            serviceId: id,
            ...metrics
        }))
        .sort((a, b) => b.trustScore - a.trustScore);

    res.json({
        success: true,
        count: leaderboard.length,
        trustThreshold: POLICIES.MIN_TRUST_SCORE,
        leaderboard
    });
}

// 3. RECORD A TRANSACTION EVENT (Rate Provider)
// Handler for: POST /api/reputation/record
function recordEvent(req, res) {
    const { serviceId, success, latencyMs, dispute } = req.body;

    if (!serviceId || !reputationStore[serviceId]) {
        return res.status(400).json({
            success: false,
            error: 'Valid service ID required to record a reputation event.'
        });
    }

    const rep = reputationStore[serviceId];

    // Update stats based on the AI's quality report
    if (success) {
        rep.successfulCalls += 1;
        // Trust slowly climbs on success (capped at 99.9)
        rep.trustScore = Math.min(99.9, rep.trustScore + 0.1);
    } else {
        rep.failedCalls += 1;
        // Trust drops faster on failure
        rep.trustScore = Math.max(0, rep.trustScore - 1.5);
    }

    if (dispute) {
        rep.disputes += 1;
        // Disputes are the most punishing
        rep.trustScore = Math.max(0, rep.trustScore - 2.0);
    }

    // Exponential moving average for latency
    if (latencyMs) {
        rep.averageLatencyMs = Math.round(
            rep.averageLatencyMs * 0.7 + Number(latencyMs) * 0.3
        );
    }

    rep.lastUpdated = new Date().toISOString();

    console.log(`\n⚖️ [Reputation Controller] Updated ${serviceId}. New Score: ${rep.trustScore.toFixed(1)}`);

    res.json({
        success: true,
        message: 'Reputation event securely logged.',
        newMetrics: {
            trustScore: Number(rep.trustScore.toFixed(1)),
            successfulCalls: rep.successfulCalls,
            failedCalls: rep.failedCalls,
            disputes: rep.disputes,
            averageLatencyMs: rep.averageLatencyMs,
            lastUpdated: rep.lastUpdated
        }
    });
}

// 4. FILE A DISPUTE
// Handler for: POST /api/reputation/dispute
function fileDispute(req, res) {
    const { serviceId, reason, txHash } = req.body;

    if (!serviceId || !reputationStore[serviceId]) {
        return res.status(400).json({
            success: false,
            error: 'Valid service ID required to file a dispute.'
        });
    }

    const rep = reputationStore[serviceId];
    rep.disputes += 1;
    rep.trustScore = Math.max(0, rep.trustScore - 2.0);
    rep.lastUpdated = new Date().toISOString();

    console.log(`\n🚩 [Reputation Controller] Dispute filed against ${serviceId}. Reason: ${reason || 'Not specified'}`);

    res.json({
        success: true,
        message: `Dispute filed against ${serviceId}. Trust score reduced.`,
        dispute: {
            serviceId,
            reason: reason || 'Not specified',
            txHash: txHash || null,
            newTrustScore: Number(rep.trustScore.toFixed(1)),
            totalDisputes: rep.disputes,
            filedAt: new Date().toISOString()
        }
    });
}

// 5. RESET REPUTATION (Demo utility)
// Handler for: POST /api/reputation/reset/:serviceId
function resetReputation(req, res) {
    const { serviceId } = req.params;

    if (!reputationStore[serviceId]) {
        return res.status(404).json({
            success: false,
            error: 'Service ID not found.'
        });
    }

    reputationStore[serviceId] = {
        trustScore: 50.0,
        successfulCalls: 0,
        failedCalls: 0,
        disputes: 0,
        averageLatencyMs: 250,
        lastUpdated: new Date().toISOString()
    };

    console.log(`\n🔄 [Reputation Controller] Reset reputation for ${serviceId}`);

    res.json({
        success: true,
        message: `Reputation for ${serviceId} has been reset to neutral.`,
        metrics: reputationStore[serviceId]
    });
}

// EXPORTS
module.exports = {
    getReputation,
    getAllReputations,
    recordEvent,
    fileDispute,
    resetReputation
};
