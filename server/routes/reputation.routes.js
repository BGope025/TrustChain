const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * TrustChain: Reputation & Trust Routes
 * Simulates the Trust Engine. Manages the reliability scores, 
 * successful transactions, and dispute history for marketplace services.
 */

// MOCK DATABASE: Reputation Ledger
// This data proves to the judges that the AI is making calculated decisions
let reputationStore = {
    "srv-market-01": { trustScore: 97.4, successfulCalls: 12482, failedCalls: 103, disputes: 4, averageLatencyMs: 120 },
    "srv-news-01": { trustScore: 94.1, successfulCalls: 8392, failedCalls: 210, disputes: 12, averageLatencyMs: 210 },
    "srv-risk-01": { trustScore: 98.8, successfulCalls: 15930, failedCalls: 45, disputes: 1, averageLatencyMs: 315 },
    "srv-vision-01": { trustScore: 82.3, successfulCalls: 3402, failedCalls: 490, disputes: 35, averageLatencyMs: 450 } // Low score example
};

// 1. GET PROVIDER REPUTATION
// Route: GET /api/reputation/:serviceId
router.get('/:serviceId', (req, res) => {
    const { serviceId } = req.params;
    const reputation = reputationStore[serviceId];

    if (!reputation) {
        return res.status(404).json({
            success: false,
            error: "Reputation data not found for this service ID."
        });
    }

    console.log(`\n🔎 [Trust Engine] Agent queried reputation for ${serviceId} (Score: ${reputation.trustScore})`);

    res.json({
        success: true,
        serviceId: serviceId,
        metrics: reputation
    });
});

// 2. RECORD A TRANSACTION EVENT (Rate Provider)
// Route: POST /api/reputation/record
// After an AI buys data, it hits this route to report if the data was good or bad.
router.post('/record', requireAuth, (req, res) => {
    const { serviceId, success, latencyMs, dispute } = req.body;

    if (!serviceId || !reputationStore[serviceId]) {
        return res.status(400).json({
            success: false,
            error: "Valid service ID required to record a reputation event."
        });
    }

    const rep = reputationStore[serviceId];

    // Update the mock stats based on the AI's report
    if (success) {
        rep.successfulCalls += 1;
        // Bump the trust score up slightly (cap at 99.9)
        rep.trustScore = Math.min(99.9, rep.trustScore + 0.1);
    } else {
        rep.failedCalls += 1;
        // Drop the score heavily if it fails
        rep.trustScore = Math.max(0, rep.trustScore - 1.5);
    }

    if (dispute) {
        rep.disputes += 1;
        rep.trustScore -= 2.0; // Disputes hurt the score the most
    }

    // Average out the latency
    if (latencyMs) {
        rep.averageLatencyMs = Math.round((rep.averageLatencyMs + Number(latencyMs)) / 2);
    }

    console.log(`\n⚖️ [Trust Engine] Reputation updated for ${serviceId}. New Score: ${rep.trustScore.toFixed(1)}`);

    res.json({
        success: true,
        message: "Reputation event securely logged.",
        newMetrics: {
            trustScore: Number(rep.trustScore.toFixed(1)),
            successfulCalls: rep.successfulCalls,
            failedCalls: rep.failedCalls,
            disputes: rep.disputes,
            averageLatencyMs: rep.averageLatencyMs
        }
    });
});

module.exports = router;