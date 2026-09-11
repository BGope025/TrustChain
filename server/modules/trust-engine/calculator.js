/**
 * TrustChain: Trust Score Calculator
 * Computes a composite reputation score for marketplace service providers
 * by blending multiple signals into a single 0-100 metric.
 *
 * Score Components:
 *   - Reliability  (40%) — success rate over lifetime calls
 *   - Latency      (20%) — how fast the service responds
 *   - Disputes     (25%) — inverse of dispute ratio
 *   - Tenure       (15%) — time since first registration
 */

// WEIGHT CONFIGURATION
const WEIGHTS = {
    reliability: 0.40,
    latency:     0.20,
    disputes:    0.25,
    tenure:      0.15
};

// Normalisation constants
const IDEAL_LATENCY_MS       = 100;    // Best possible latency
const MAX_LATENCY_MS         = 1000;   // Worst acceptable latency
const MAX_TENURE_DAYS        = 365;    // Full tenure credit at 1 year

// MAIN CALCULATOR

/**
 * Computes a composite trust score for a service provider.
 *
 * @param   {Object}  metrics
 * @param   {number}  metrics.successfulCalls   - Total successful API calls
 * @param   {number}  metrics.failedCalls       - Total failed API calls
 * @param   {number}  metrics.disputes          - Total disputes filed
 * @param   {number}  metrics.averageLatencyMs  - Moving average latency
 * @param   {string}  [metrics.registeredAt]    - ISO timestamp of registration
 * @returns {Object}  { compositeScore, components, grade }
 */
function calculate(metrics) {
    const {
        successfulCalls = 0,
        failedCalls = 0,
        disputes = 0,
        averageLatencyMs = 250,
        registeredAt = new Date().toISOString()
    } = metrics;

    const totalCalls = successfulCalls + failedCalls;

    // ── Component 1: Reliability 
    const reliabilityRaw = totalCalls > 0
        ? successfulCalls / totalCalls
        : 0.5; // No data defaults to neutral
    const reliability = reliabilityRaw * 100;

    // ── Component 2: Latency 
    // Score 100 at IDEAL, 0 at MAX, linear interpolation
    const latencyClamped = Math.min(Math.max(averageLatencyMs, IDEAL_LATENCY_MS), MAX_LATENCY_MS);
    const latency = 100 * (1 - (latencyClamped - IDEAL_LATENCY_MS) / (MAX_LATENCY_MS - IDEAL_LATENCY_MS));

    // ── Component 3: Dispute Ratio 
    // 0 disputes = 100, every dispute reduces score exponentially
    const disputeRatio = totalCalls > 0 ? disputes / totalCalls : 0;
    const disputeScore = Math.max(0, 100 * (1 - disputeRatio * 50)); // 2% disputes = score 0

    // ── Component 4: Tenure 
    const tenureDays = (Date.now() - new Date(registeredAt).getTime()) / (1000 * 60 * 60 * 24);
    const tenure = Math.min(100, (tenureDays / MAX_TENURE_DAYS) * 100);

    // ── Weighted composite 
    const composite =
        (WEIGHTS.reliability * reliability) +
        (WEIGHTS.latency     * latency) +
        (WEIGHTS.disputes    * disputeScore) +
        (WEIGHTS.tenure      * tenure);

    const compositeScore = Number(Math.min(99.9, Math.max(0, composite)).toFixed(1));

    return {
        compositeScore,
        components: {
            reliability: Number(reliability.toFixed(1)),
            latency:     Number(latency.toFixed(1)),
            disputes:    Number(disputeScore.toFixed(1)),
            tenure:      Number(tenure.toFixed(1))
        },
        weights: { ...WEIGHTS },
        grade: _toGrade(compositeScore),
        totalCalls,
        calculatedAt: new Date().toISOString()
    };
}

/**
 * Batch-calculates trust scores for an array of provider metrics.
 *
 * @param   {Array}  providers - Array of { serviceId, ...metrics }
 * @returns {Array}  Scored providers, sorted by composite score desc
 */
function calculateBatch(providers) {
    return providers
        .map(p => ({
            serviceId: p.serviceId || p.id,
            name: p.name,
            ...calculate(p)
        }))
        .sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Recalculates a score after a new event (success, failure, or dispute).
 * Returns the delta from the previous score.
 *
 * @param   {number} previousScore
 * @param   {Object} metrics - Updated metrics
 * @returns {Object} { newScore, delta, direction }
 */
function recalculate(previousScore, metrics) {
    const result = calculate(metrics);
    const delta = Number((result.compositeScore - previousScore).toFixed(1));

    return {
        newScore: result.compositeScore,
        previousScore,
        delta,
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
        components: result.components,
        grade: result.grade
    };
}

// GRADE MAPPING

function _toGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

/**
 * Returns the weight configuration (for admin UI / tuning).
 */
function getWeights() {
    return { ...WEIGHTS };
}

// EXPORTS
module.exports = {
    calculate,
    calculateBatch,
    recalculate,
    getWeights
};
