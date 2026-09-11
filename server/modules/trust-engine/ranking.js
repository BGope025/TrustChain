const calculator = require('./calculator');
const { POLICIES } = require('../../config/constants');

/**
 * TrustChain: Provider Ranking Engine
 * Sorts marketplace providers by optimising the trade-off between
 * cost and trust. Supports multiple ranking strategies so the AI
 * can choose the best approach per task.
 *
 * Strategies:
 *   - 'balanced'       — Default; equal weight to trust and cost
 *   - 'trust_first'    — Maximise reliability, ignore cost
 *   - 'cheapest'       — Minimise cost, accept any trusted provider
 *   - 'fastest'        — Minimise latency above all
 *   - 'value'          — Best trust-per-dollar ratio
 */

// STRATEGY DEFINITIONS
const STRATEGIES = {
    balanced: {
        name: 'Balanced',
        description: 'Equal weight to trust and cost',
        scoreFn: (svc) => (svc.trustScore * 0.5) - (svc.cost * 10000 * 0.3) - (svc.latencyMs / 100 * 0.2)
    },
    trust_first: {
        name: 'Trust First',
        description: 'Maximise reliability, cost is secondary',
        scoreFn: (svc) => svc.trustScore * 0.85 - (svc.latencyMs / 100 * 0.15)
    },
    cheapest: {
        name: 'Cheapest',
        description: 'Minimise cost while above trust threshold',
        scoreFn: (svc) => (100 - svc.cost * 10000) * 0.7 + svc.trustScore * 0.3
    },
    fastest: {
        name: 'Fastest',
        description: 'Minimise latency above all',
        scoreFn: (svc) => (1000 - svc.latencyMs) * 0.6 + svc.trustScore * 0.4
    },
    value: {
        name: 'Best Value',
        description: 'Highest trust-per-dollar ratio',
        scoreFn: (svc) => svc.cost > 0 ? svc.trustScore / (svc.cost * 1000) : svc.trustScore
    }
};

// MAIN RANKING

/**
 * Ranks an array of services using the specified strategy.
 *
 * @param   {Array}   services  - Array of service objects from the marketplace
 * @param   {Object}  [options]
 * @param   {string}  [options.strategy='balanced'] - Ranking strategy key
 * @param   {number}  [options.limit=10]            - Max results
 * @param   {boolean} [options.trustGate=true]      - Enforce min trust threshold
 * @returns {Object}  { strategy, ranked[], filteredOut }
 */
function rank(services, options = {}) {
    const {
        strategy = 'balanced',
        limit = 10,
        trustGate = true
    } = options;

    const strategyDef = STRATEGIES[strategy] || STRATEGIES.balanced;

    // ── Optional trust gate 
    let eligible = [...services];
    let filteredOut = 0;

    if (trustGate) {
        const before = eligible.length;
        eligible = eligible.filter(svc => svc.trustScore >= POLICIES.MIN_TRUST_SCORE);
        filteredOut = before - eligible.length;
    }

    // ── Score and sort 
    const scored = eligible.map(svc => ({
        ...svc,
        rankScore: Number(strategyDef.scoreFn(svc).toFixed(4))
    }));

    scored.sort((a, b) => b.rankScore - a.rankScore);

    // ── Assign rank positions 
    const ranked = scored.slice(0, limit).map((svc, index) => ({
        rank: index + 1,
        id: svc.id,
        name: svc.name,
        provider: svc.provider,
        trustScore: svc.trustScore,
        cost: svc.cost,
        latencyMs: svc.latencyMs,
        rankScore: svc.rankScore,
        category: svc.category
    }));

    console.log(
        `🏅 [Ranking] Strategy: ${strategyDef.name} — ` +
        `${ranked.length} ranked, ${filteredOut} filtered out`
    );

    return {
        strategy: strategyDef.name,
        strategyKey: strategy,
        description: strategyDef.description,
        ranked,
        filteredOut,
        trustThreshold: trustGate ? POLICIES.MIN_TRUST_SCORE : null,
        rankedAt: new Date().toISOString()
    };
}

/**
 * Compares two services head-to-head across all strategies.
 *
 * @param   {Object} serviceA
 * @param   {Object} serviceB
 * @returns {Object} Comparison result with winner per strategy
 */
function compareHeadToHead(serviceA, serviceB) {
    const comparison = {};

    for (const [key, def] of Object.entries(STRATEGIES)) {
        const scoreA = def.scoreFn(serviceA);
        const scoreB = def.scoreFn(serviceB);

        comparison[key] = {
            strategy: def.name,
            scoreA: Number(scoreA.toFixed(4)),
            scoreB: Number(scoreB.toFixed(4)),
            winner: scoreA > scoreB ? serviceA.name : scoreB > scoreA ? serviceB.name : 'Tie'
        };
    }

    return {
        serviceA: { id: serviceA.id, name: serviceA.name },
        serviceB: { id: serviceB.id, name: serviceB.name },
        strategies: comparison
    };
}

/**
 * Returns the list of available ranking strategies.
 */
function getStrategies() {
    return Object.entries(STRATEGIES).map(([key, def]) => ({
        key,
        name: def.name,
        description: def.description
    }));
}

// EXPORTS
module.exports = {
    rank,
    compareHeadToHead,
    getStrategies
};
