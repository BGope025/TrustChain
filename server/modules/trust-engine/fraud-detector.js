/**
 * TrustChain: Fraud Detector
 * Detects suspicious patterns in marketplace activity that may indicate
 * sybil attacks, spam results, or provider manipulation.
 *
 * Detection heuristics:
 *   1. Velocity check   — too many registrations from one provider in short time
 *   2. Clone detection   — near-identical service names / costs suggesting sybil
 *   3. Spam results      — suspiciously fast responses (< 10ms = fake data)
 *   4. Price anomaly     — cost deviating > 3σ from category average
 *   5. Trust inflation   — trust score climbing unnaturally fast
 */

// ALERT STORE
const alerts = [];
const MAX_ALERTS = 500;

// 1. VELOCITY CHECK

/**
 * Detects if a single provider has registered too many services
 * in a short time window (potential sybil attack).
 *
 * @param   {Array}   services    - Full service registry
 * @param   {string}  provider    - Provider name to check
 * @param   {number}  [windowMs=3600000] - Time window (default: 1 hour)
 * @param   {number}  [maxAllowed=3]     - Max registrations per window
 * @returns {Object}  { flagged, count, provider, severity }
 */
function velocityCheck(services, provider, windowMs = 3600000, maxAllowed = 3) {
    const now = Date.now();
    const recentByProvider = services.filter(svc => {
        if (svc.provider.toLowerCase() !== provider.toLowerCase()) return false;
        const registeredAt = new Date(svc.registeredAt || 0).getTime();
        return (now - registeredAt) < windowMs;
    });

    const flagged = recentByProvider.length > maxAllowed;

    if (flagged) {
        _recordAlert('VELOCITY_SYBIL', 'high', {
            provider,
            registrations: recentByProvider.length,
            windowMs,
            maxAllowed
        });
    }

    return {
        flagged,
        count: recentByProvider.length,
        provider,
        threshold: maxAllowed,
        severity: flagged ? 'high' : 'none'
    };
}

// 2. CLONE DETECTION

/**
 * Detects near-identical services that may be sybil clones.
 * Checks for matching names (Levenshtein distance ≤ 2) and identical costs.
 *
 * @param   {Array}  services - Full service registry
 * @returns {Object} { flagged, cloneGroups[], totalClones }
 */
function detectClones(services) {
    const cloneGroups = [];
    const checked = new Set();

    for (let i = 0; i < services.length; i++) {
        if (checked.has(services[i].id)) continue;

        const group = [services[i]];

        for (let j = i + 1; j < services.length; j++) {
            if (checked.has(services[j].id)) continue;

            const nameDistance = _levenshtein(
                services[i].name.toLowerCase(),
                services[j].name.toLowerCase()
            );
            const sameCost = Math.abs(services[i].cost - services[j].cost) < 0.0001;

            if (nameDistance <= 2 && sameCost) {
                group.push(services[j]);
                checked.add(services[j].id);
            }
        }

        if (group.length > 1) {
            cloneGroups.push({
                anchor: group[0].name,
                clones: group.map(s => ({ id: s.id, name: s.name, provider: s.provider })),
                count: group.length
            });
            checked.add(services[i].id);
        }
    }

    const flagged = cloneGroups.length > 0;
    if (flagged) {
        _recordAlert('CLONE_SYBIL', 'medium', { cloneGroups: cloneGroups.length });
    }

    return {
        flagged,
        cloneGroups,
        totalClones: cloneGroups.reduce((s, g) => s + g.count, 0)
    };
}

// 3. SPAM RESULT DETECTION

/**
 * Flags results that returned suspiciously fast, implying pre-computed
 * or fake data rather than genuine API processing.
 *
 * @param   {Object}  result
 * @param   {number}  result.latencyMs
 * @param   {number}  [minExpectedMs=10] - Anything below this is suspicious
 * @returns {Object}  { flagged, latencyMs, severity }
 */
function detectSpamResult(result, minExpectedMs = 10) {
    const flagged = result.latencyMs < minExpectedMs;

    if (flagged) {
        _recordAlert('SPAM_RESULT', 'medium', {
            serviceId: result.serviceId,
            serviceName: result.serviceName,
            latencyMs: result.latencyMs
        });
    }

    return {
        flagged,
        latencyMs: result.latencyMs,
        threshold: minExpectedMs,
        severity: flagged ? 'medium' : 'none'
    };
}

// 4. PRICE ANOMALY DETECTION

/**
 * Detects services whose cost deviates significantly from the category average.
 *
 * @param   {Object}  service  - Service to check
 * @param   {Array}   peers    - Other services in the same category
 * @param   {number}  [sigmaThreshold=3] - Standard deviations for anomaly
 * @returns {Object}  { flagged, deviation, avgCost, stdDev }
 */
function detectPriceAnomaly(service, peers, sigmaThreshold = 3) {
    if (peers.length < 2) {
        return { flagged: false, reason: 'insufficient_peers' };
    }

    const costs = peers.map(p => p.cost);
    const avg = costs.reduce((s, c) => s + c, 0) / costs.length;
    const variance = costs.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    const deviation = stdDev > 0 ? Math.abs(service.cost - avg) / stdDev : 0;
    const flagged = deviation > sigmaThreshold;

    if (flagged) {
        _recordAlert('PRICE_ANOMALY', 'low', {
            serviceId: service.id,
            serviceName: service.name,
            cost: service.cost,
            avgCost: Number(avg.toFixed(4)),
            deviation: Number(deviation.toFixed(2))
        });
    }

    return {
        flagged,
        deviation: Number(deviation.toFixed(2)),
        avgCost: Number(avg.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4)),
        severity: flagged ? 'low' : 'none'
    };
}

// 5. TRUST INFLATION DETECTION

/**
 * Detects unnaturally fast trust score increases that suggest manipulation.
 *
 * @param   {Object}  metrics
 * @param   {number}  metrics.previousScore
 * @param   {number}  metrics.currentScore
 * @param   {number}  metrics.timeWindowMs  - Time over which the change happened
 * @param   {number}  [maxDeltaPerHour=5]   - Max allowed score increase per hour
 * @returns {Object}  { flagged, deltaPerHour, threshold }
 */
function detectTrustInflation(metrics, maxDeltaPerHour = 5) {
    const { previousScore, currentScore, timeWindowMs } = metrics;
    const hours = timeWindowMs / (1000 * 60 * 60);
    const delta = currentScore - previousScore;
    const deltaPerHour = hours > 0 ? delta / hours : delta;

    const flagged = deltaPerHour > maxDeltaPerHour && delta > 0;

    if (flagged) {
        _recordAlert('TRUST_INFLATION', 'high', {
            previousScore,
            currentScore,
            deltaPerHour: Number(deltaPerHour.toFixed(2))
        });
    }

    return {
        flagged,
        delta: Number(delta.toFixed(1)),
        deltaPerHour: Number(deltaPerHour.toFixed(2)),
        threshold: maxDeltaPerHour,
        severity: flagged ? 'high' : 'none'
    };
}

// FULL SCAN

/**
 * Runs all detection heuristics against the current service registry.
 *
 * @param   {Array}  services - Full service registry
 * @returns {Object} { totalAlerts, alerts[] }
 */
function fullScan(services) {
    const results = [];

    // Clone detection
    const clones = detectClones(services);
    if (clones.flagged) results.push({ type: 'CLONE_SYBIL', ...clones });

    // Velocity per provider
    const providers = [...new Set(services.map(s => s.provider))];
    for (const provider of providers) {
        const velocity = velocityCheck(services, provider);
        if (velocity.flagged) results.push({ type: 'VELOCITY_SYBIL', ...velocity });
    }

    console.log(`🔍 [Fraud Detector] Full scan complete — ${results.length} issue(s) found`);

    return {
        totalAlerts: results.length,
        alerts: results,
        scannedServices: services.length,
        scannedAt: new Date().toISOString()
    };
}

// ALERT MANAGEMENT

function _recordAlert(type, severity, details) {
    alerts.push({
        type,
        severity,
        details,
        timestamp: new Date().toISOString()
    });
    if (alerts.length > MAX_ALERTS) alerts.shift();

    console.log(`🚩 [Fraud Detector] Alert: ${type} (${severity})`);
}

/**
 * Returns recent fraud alerts.
 */
function getAlerts(limit = 50) {
    return alerts.slice(-limit).reverse();
}

/**
 * Clears all alerts.
 */
function clearAlerts() {
    alerts.length = 0;
}

// LEVENSHTEIN DISTANCE (for clone detection)

function _levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1]
                ? matrix[i - 1][j - 1]
                : Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
        }
    }
    return matrix[b.length][a.length];
}

// EXPORTS
module.exports = {
    velocityCheck,
    detectClones,
    detectSpamResult,
    detectPriceAnomaly,
    detectTrustInflation,
    fullScan,
    getAlerts,
    clearAlerts
};
