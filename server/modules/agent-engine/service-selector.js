const marketplaceService = require('../../services/marketplace.service');
const { POLICIES } = require('../../config/constants');

/**
 * TrustChain: Service Selector
 * Matches subtasks against the marketplace registry using a weighted
 * scoring algorithm that balances trust, cost, and latency.
 *
 * Scoring formula:
 *   score = (trustWeight × trustScore) − (costWeight × normCost) − (latencyWeight × normLatency)
 */

// SCORING WEIGHTS (tunable)
const WEIGHTS = {
    trust:   0.50,   // Trust is king — 50% of the decision
    cost:    0.30,   // Cost matters — 30%
    latency: 0.20    // Speed is a tiebreaker — 20%
};

// Normalisation bounds
const MAX_COST_USDC   = 0.05;   // $0.05 max for normalisation
const MAX_LATENCY_MS  = 1000;   // 1 second max for normalisation

// MAIN FUNCTION

/**
 * Selects the single best service for a given subtask requirement.
 *
 * @param   {Object}  requirement
 * @param   {string}  requirement.category            - Service category
 * @param   {string}  [requirement.requiredCapability] - Specific capability tag
 * @param   {number}  [requirement.maxCost]            - Budget ceiling override
 * @returns {Object|null} The best-scoring service, or null if none qualify
 */
function selectBestService(requirement) {
    const { category, maxCost } = requirement;

    // Pull candidates from the marketplace
    const candidates = marketplaceService.discoverServices({
        category,
        minTrustScore: POLICIES.MIN_TRUST_SCORE,
        maxCost: maxCost || POLICIES.MAX_PER_TX_SPEND
    });

    if (candidates.length === 0) {
        console.log(`⚠️  [Service Selector] No qualifying services for category: ${category}`);
        return null;
    }

    // Score each candidate
    const scored = candidates.map(svc => {
        const trustNorm   = svc.trustScore / 100;
        const costNorm    = Math.min(svc.cost / MAX_COST_USDC, 1);
        const latencyNorm = Math.min(svc.latencyMs / MAX_LATENCY_MS, 1);

        const score =
            (WEIGHTS.trust   * trustNorm) -
            (WEIGHTS.cost    * costNorm) -
            (WEIGHTS.latency * latencyNorm);

        return { ...svc, _score: Number(score.toFixed(4)) };
    });

    // Sort by score descending
    scored.sort((a, b) => b._score - a._score);

    const winner = scored[0];

    console.log(
        `🏆 [Service Selector] Selected: ${winner.name} ` +
        `(score: ${winner._score}, trust: ${winner.trustScore}, ` +
        `cost: $${winner.cost}, latency: ${winner.latencyMs}ms) ` +
        `from ${scored.length} candidates`
    );

    // Strip internal scoring field before returning
    const { _score, ...service } = winner;
    return service;
}

/**
 * Returns ranked candidates for a category (for debug / comparison UI).
 *
 * @param   {string}  category
 * @param   {number}  [limit=10]
 * @returns {Array}   Scored and ranked services
 */
function rankCandidates(category, limit = 10) {
    const candidates = marketplaceService.discoverServices({
        category,
        minTrustScore: 0  // Show all, even untrusted, for comparison
    });

    const scored = candidates.map(svc => {
        const trustNorm   = svc.trustScore / 100;
        const costNorm    = Math.min(svc.cost / MAX_COST_USDC, 1);
        const latencyNorm = Math.min(svc.latencyMs / MAX_LATENCY_MS, 1);

        const score =
            (WEIGHTS.trust   * trustNorm) -
            (WEIGHTS.cost    * costNorm) -
            (WEIGHTS.latency * latencyNorm);

        return {
            id: svc.id,
            name: svc.name,
            provider: svc.provider,
            trustScore: svc.trustScore,
            cost: svc.cost,
            latencyMs: svc.latencyMs,
            compositeScore: Number(score.toFixed(4)),
            meetsTrustThreshold: svc.trustScore >= POLICIES.MIN_TRUST_SCORE,
            withinBudget: svc.cost <= POLICIES.MAX_PER_TX_SPEND
        };
    });

    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    return scored.slice(0, limit);
}

/**
 * Returns the current scoring weights.
 */
function getWeights() {
    return { ...WEIGHTS };
}

/**
 * Dynamically adjusts scoring weights (for A/B testing or admin tuning).
 *
 * @param   {Object}  newWeights
 * @param   {number}  [newWeights.trust]
 * @param   {number}  [newWeights.cost]
 * @param   {number}  [newWeights.latency]
 */
function setWeights(newWeights = {}) {
    if (newWeights.trust   !== undefined) WEIGHTS.trust   = Number(newWeights.trust);
    if (newWeights.cost    !== undefined) WEIGHTS.cost    = Number(newWeights.cost);
    if (newWeights.latency !== undefined) WEIGHTS.latency = Number(newWeights.latency);

    console.log(`⚙️  [Service Selector] Weights updated:`, WEIGHTS);
}

// EXPORTS
module.exports = {
    selectBestService,
    rankCandidates,
    getWeights,
    setWeights
};
