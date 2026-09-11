/**
 * ASB-Pay: Analytics Service
 * Aggregates system-wide throughput, cost, and performance metrics
 * across all services. Powers the dashboard analytics panel and
 * provides data for AI-driven cost optimization.
 */

// ------------------------------------------
// IN-MEMORY ANALYTICS STORE
// ------------------------------------------
const analyticsStore = {
    // Cumulative counters
    totalRequests: 0,
    totalSettlements: 0,
    totalRevenue: 0,            // USDC earned by providers
    totalAgentSpend: 0,         // USDC spent by the agent
    totalErrors: 0,

    // Time-series buckets (last 24 hours, 1-hour granularity)
    hourlyBuckets: [],

    // Per-service breakdown
    serviceMetrics: {},

    // Per-provider breakdown
    providerMetrics: {},

    // Latency tracking
    latencySamples: [],

    // Session start
    startedAt: new Date().toISOString()
};

// ------------------------------------------
// 1. RECORD EVENTS
// ------------------------------------------

/**
 * Records a successful API request + settlement event.
 *
 * @param {Object}  event
 * @param {string}  event.serviceId    - Service that was called
 * @param {string}  event.serviceName  - Human-readable name
 * @param {string}  event.provider     - Provider name
 * @param {number}  event.cost         - USDC amount settled
 * @param {number}  event.latencyMs    - Round-trip latency
 * @param {string}  event.txHash       - Settlement transaction hash
 * @param {boolean} [event.success=true]
 */
function recordEvent(event) {
    const {
        serviceId,
        serviceName,
        provider,
        cost = 0,
        latencyMs = 0,
        txHash,
        success = true
    } = event;

    analyticsStore.totalRequests += 1;

    if (success) {
        analyticsStore.totalSettlements += 1;
        analyticsStore.totalRevenue += cost;
        analyticsStore.totalAgentSpend += cost;
    } else {
        analyticsStore.totalErrors += 1;
    }

    // --- Latency tracking ---
    analyticsStore.latencySamples.push(latencyMs);
    // Cap at 1000 samples for memory
    if (analyticsStore.latencySamples.length > 1000) {
        analyticsStore.latencySamples.shift();
    }

    // --- Per-service metrics ---
    if (!analyticsStore.serviceMetrics[serviceId]) {
        analyticsStore.serviceMetrics[serviceId] = {
            name: serviceName,
            requests: 0,
            settlements: 0,
            errors: 0,
            totalCost: 0,
            avgLatencyMs: 0,
            latencySamples: []
        };
    }

    const svcMetric = analyticsStore.serviceMetrics[serviceId];
    svcMetric.requests += 1;
    if (success) {
        svcMetric.settlements += 1;
        svcMetric.totalCost += cost;
    } else {
        svcMetric.errors += 1;
    }
    svcMetric.latencySamples.push(latencyMs);
    if (svcMetric.latencySamples.length > 200) svcMetric.latencySamples.shift();
    svcMetric.avgLatencyMs = Math.round(
        svcMetric.latencySamples.reduce((a, b) => a + b, 0) / svcMetric.latencySamples.length
    );

    // --- Per-provider metrics ---
    if (!analyticsStore.providerMetrics[provider]) {
        analyticsStore.providerMetrics[provider] = {
            requests: 0,
            settlements: 0,
            errors: 0,
            totalRevenue: 0
        };
    }

    const provMetric = analyticsStore.providerMetrics[provider];
    provMetric.requests += 1;
    if (success) {
        provMetric.settlements += 1;
        provMetric.totalRevenue += cost;
    } else {
        provMetric.errors += 1;
    }

    // --- Hourly bucket ---
    _updateHourlyBucket(cost, success);

    console.log(
        `📈 [Analytics] Recorded ${success ? '✓' : '✗'} event — ` +
        `${serviceName} ($${cost.toFixed(4)}, ${latencyMs}ms)`
    );
}

// ------------------------------------------
// 2. SYSTEM THROUGHPUT DASHBOARD
// ------------------------------------------

/**
 * Returns the high-level system throughput summary.
 * This is what the frontend analytics panel consumes.
 *
 * @returns {Object} throughput metrics
 */
function getSystemThroughput() {
    const uptimeMs = Date.now() - new Date(analyticsStore.startedAt).getTime();
    const uptimeHours = uptimeMs / (1000 * 60 * 60);

    const avgLatency = analyticsStore.latencySamples.length > 0
        ? analyticsStore.latencySamples.reduce((a, b) => a + b, 0) / analyticsStore.latencySamples.length
        : 0;

    const p95Latency = _percentile(analyticsStore.latencySamples, 95);
    const successRate = analyticsStore.totalRequests > 0
        ? ((analyticsStore.totalSettlements / analyticsStore.totalRequests) * 100)
        : 100;

    return {
        totalRequests: analyticsStore.totalRequests,
        totalSettlements: analyticsStore.totalSettlements,
        totalErrors: analyticsStore.totalErrors,
        successRate: Number(successRate.toFixed(1)),
        totalVolume: Number(analyticsStore.totalRevenue.toFixed(4)),
        currency: 'USDC',
        avgLatencyMs: Math.round(avgLatency),
        p95LatencyMs: Math.round(p95Latency),
        requestsPerHour: uptimeHours > 0
            ? Number((analyticsStore.totalRequests / uptimeHours).toFixed(1))
            : 0,
        uptime: _formatUptime(uptimeMs),
        startedAt: analyticsStore.startedAt
    };
}

// ------------------------------------------
// 3. COST AGGREGATION
// ------------------------------------------

/**
 * Returns a detailed cost breakdown by service and provider.
 *
 * @returns {Object} cost report
 */
function getCostReport() {
    const serviceBreakdown = Object.entries(analyticsStore.serviceMetrics).map(
        ([id, m]) => ({
            serviceId: id,
            name: m.name,
            calls: m.settlements,
            totalCost: Number(m.totalCost.toFixed(4)),
            avgCostPerCall: m.settlements > 0
                ? Number((m.totalCost / m.settlements).toFixed(4))
                : 0,
            avgLatencyMs: m.avgLatencyMs,
            errorRate: m.requests > 0
                ? Number(((m.errors / m.requests) * 100).toFixed(1))
                : 0
        })
    );

    const providerBreakdown = Object.entries(analyticsStore.providerMetrics).map(
        ([name, m]) => ({
            provider: name,
            totalCalls: m.settlements,
            totalRevenue: Number(m.totalRevenue.toFixed(4)),
            errors: m.errors
        })
    );

    return {
        totalAgentSpend: Number(analyticsStore.totalAgentSpend.toFixed(4)),
        totalProviderRevenue: Number(analyticsStore.totalRevenue.toFixed(4)),
        currency: 'USDC',
        byService: serviceBreakdown.sort((a, b) => b.totalCost - a.totalCost),
        byProvider: providerBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue)
    };
}

// ------------------------------------------
// 4. HOURLY TIME-SERIES
// ------------------------------------------

/**
 * Returns the last 24 hours of activity in 1-hour buckets.
 * Useful for rendering sparkline charts on the dashboard.
 *
 * @returns {Array} hourly data points
 */
function getHourlyTimeSeries() {
    return [...analyticsStore.hourlyBuckets].slice(-24);
}

// ------------------------------------------
// 5. PER-SERVICE DEEP DIVE
// ------------------------------------------

/**
 * Returns detailed analytics for a specific service.
 *
 * @param   {string} serviceId
 * @returns {Object|null} Service analytics or null if no data
 */
function getServiceAnalytics(serviceId) {
    const m = analyticsStore.serviceMetrics[serviceId];
    if (!m) return null;

    return {
        serviceId,
        name: m.name,
        requests: m.requests,
        settlements: m.settlements,
        errors: m.errors,
        totalCost: Number(m.totalCost.toFixed(4)),
        avgLatencyMs: m.avgLatencyMs,
        p95LatencyMs: Math.round(_percentile(m.latencySamples, 95)),
        errorRate: m.requests > 0
            ? Number(((m.errors / m.requests) * 100).toFixed(1))
            : 0,
        successRate: m.requests > 0
            ? Number(((m.settlements / m.requests) * 100).toFixed(1))
            : 100
    };
}

// ------------------------------------------
// 6. RESET (useful for demos)
// ------------------------------------------

/**
 * Resets all analytics counters to zero.
 * Intended for demo resets during the hackathon pitch.
 */
function resetAnalytics() {
    analyticsStore.totalRequests = 0;
    analyticsStore.totalSettlements = 0;
    analyticsStore.totalRevenue = 0;
    analyticsStore.totalAgentSpend = 0;
    analyticsStore.totalErrors = 0;
    analyticsStore.hourlyBuckets = [];
    analyticsStore.serviceMetrics = {};
    analyticsStore.providerMetrics = {};
    analyticsStore.latencySamples = [];
    analyticsStore.startedAt = new Date().toISOString();

    console.log(`🔄 [Analytics] All metrics reset.`);
}

// ------------------------------------------
// INTERNAL HELPERS
// ------------------------------------------

/**
 * Adds the event data to the current hourly bucket.
 */
function _updateHourlyBucket(cost, success) {
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-` +
                    `${String(now.getDate()).padStart(2, '0')}T` +
                    `${String(now.getHours()).padStart(2, '0')}:00`;

    let bucket = analyticsStore.hourlyBuckets.find(b => b.hour === hourKey);

    if (!bucket) {
        bucket = { hour: hourKey, requests: 0, settlements: 0, errors: 0, volume: 0 };
        analyticsStore.hourlyBuckets.push(bucket);

        // Keep only the last 48 hours max
        if (analyticsStore.hourlyBuckets.length > 48) {
            analyticsStore.hourlyBuckets.shift();
        }
    }

    bucket.requests += 1;
    if (success) {
        bucket.settlements += 1;
        bucket.volume += cost;
    } else {
        bucket.errors += 1;
    }

    // Round volume to avoid floating-point drift
    bucket.volume = Number(bucket.volume.toFixed(4));
}

/**
 * Calculates the Nth percentile of a numeric array.
 */
function _percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

/**
 * Formats milliseconds into a human-readable uptime string.
 */
function _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// ------------------------------------------
// EXPORTS
// ------------------------------------------
module.exports = {
    recordEvent,
    getSystemThroughput,
    getCostReport,
    getHourlyTimeSeries,
    getServiceAnalytics,
    resetAnalytics
};
