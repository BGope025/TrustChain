const { POLICIES } = require('../config/constants');

/**
 * ASB-Pay: Marketplace Service
 * Service discovery layer for the AI agent. Manages the registry of x402-
 * compatible API providers, handles trust-score filtering, category search,
 * and provider profile management.
 */

// ------------------------------------------
// IN-MEMORY SERVICE REGISTRY
// ------------------------------------------
const serviceRegistry = [
    {
        id: 'srv-market-01',
        name: 'MarketData Pro',
        category: 'Finance',
        cost: 0.002,
        currency: 'USDC',
        provider: 'Algorand Finance',
        trustScore: 97,
        latencyMs: 120,
        status: 'Active',
        registeredAt: new Date().toISOString()
    },
    {
        id: 'srv-news-01',
        name: 'NewsPulse API',
        category: 'Media',
        cost: 0.004,
        currency: 'USDC',
        provider: 'Data Oracle',
        trustScore: 94,
        latencyMs: 210,
        status: 'Active',
        registeredAt: new Date().toISOString()
    },
    {
        id: 'srv-risk-01',
        name: 'RiskAI Engine',
        category: 'Analytics',
        cost: 0.006,
        currency: 'USDC',
        provider: 'Trust Analytics',
        trustScore: 98,
        latencyMs: 315,
        status: 'Active',
        registeredAt: new Date().toISOString()
    },
    {
        id: 'srv-vision-01',
        name: 'Vision OCR',
        category: 'AI',
        cost: 0.003,
        currency: 'USDC',
        provider: 'Neural Net Co',
        trustScore: 82,   // Below MIN_TRUST_SCORE — agent should skip this
        latencyMs: 450,
        status: 'Active',
        registeredAt: new Date().toISOString()
    }
];

// ------------------------------------------
// 1. SERVICE DISCOVERY
// ------------------------------------------

/**
 * Returns all services matching the given filters.
 * If no filters are provided, returns all active services.
 *
 * @param   {Object}  [filters]
 * @param   {string}  [filters.category]       - Filter by category (case-insensitive)
 * @param   {number}  [filters.minTrustScore]  - Minimum trust score (default: from POLICIES)
 * @param   {number}  [filters.maxCost]        - Maximum cost in USDC
 * @param   {number}  [filters.maxLatencyMs]   - Maximum acceptable latency
 * @param   {string}  [filters.status]         - Filter by status (default: 'Active')
 * @returns {Array}   Matching services, sorted by trust score descending
 */
function discoverServices(filters = {}) {
    const {
        category,
        minTrustScore = POLICIES.MIN_TRUST_SCORE,
        maxCost,
        maxLatencyMs,
        status = 'Active'
    } = filters;

    let results = serviceRegistry.filter(svc => {
        if (svc.status !== status) return false;
        if (svc.trustScore < minTrustScore) return false;
        if (category && svc.category.toLowerCase() !== category.toLowerCase()) return false;
        if (maxCost !== undefined && svc.cost > maxCost) return false;
        if (maxLatencyMs !== undefined && svc.latencyMs > maxLatencyMs) return false;
        return true;
    });

    // Sort by trust score (highest first), then by latency (lowest first)
    results.sort((a, b) => {
        if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
        return a.latencyMs - b.latencyMs;
    });

    console.log(
        `\n🔍 [Marketplace] Discovery query — ` +
        `filters: ${JSON.stringify(filters)} → ${results.length} results`
    );

    return results;
}

/**
 * Convenience: returns every service regardless of trust / cost filters.
 * Useful for the admin dashboard.
 *
 * @param   {string}  [category] - Optional category filter
 * @returns {Array}   All services (optionally filtered by category)
 */
function getAllServices(category) {
    let results = [...serviceRegistry];

    if (category) {
        results = results.filter(
            svc => svc.category.toLowerCase() === category.toLowerCase()
        );
    }

    return results;
}

// ------------------------------------------
// 2. SINGLE SERVICE LOOKUP
// ------------------------------------------

/**
 * Fetches a single service by its ID.
 *
 * @param   {string} serviceId
 * @returns {Object|null} The service object, or null if not found
 */
function getServiceById(serviceId) {
    return serviceRegistry.find(svc => svc.id === serviceId) || null;
}

// ------------------------------------------
// 3. PROVIDER PROFILES
// ------------------------------------------

/**
 * Returns an aggregated profile for a given provider name, including
 * all of their listed services and average metrics.
 *
 * @param   {string} providerName
 * @returns {Object|null} Provider profile or null if unknown
 */
function getProviderProfile(providerName) {
    const providerServices = serviceRegistry.filter(
        svc => svc.provider.toLowerCase() === providerName.toLowerCase()
    );

    if (providerServices.length === 0) return null;

    const avgTrust = providerServices.reduce((s, svc) => s + svc.trustScore, 0) / providerServices.length;
    const avgLatency = providerServices.reduce((s, svc) => s + svc.latencyMs, 0) / providerServices.length;
    const totalCost = providerServices.reduce((s, svc) => s + svc.cost, 0);

    return {
        provider: providerName,
        serviceCount: providerServices.length,
        averageTrustScore: Number(avgTrust.toFixed(1)),
        averageLatencyMs: Math.round(avgLatency),
        totalListedCost: Number(totalCost.toFixed(4)),
        services: providerServices.map(svc => ({
            id: svc.id,
            name: svc.name,
            category: svc.category,
            cost: svc.cost,
            trustScore: svc.trustScore
        }))
    };
}

/**
 * Returns a list of all unique provider names in the registry.
 */
function listProviders() {
    const names = [...new Set(serviceRegistry.map(svc => svc.provider))];
    return names.map(name => getProviderProfile(name));
}

// ------------------------------------------
// 4. SERVICE REGISTRATION
// ------------------------------------------

/**
 * Registers a new service in the marketplace.
 * New services always start with a neutral trust score of 50.
 *
 * @param   {Object}  serviceData
 * @param   {string}  serviceData.name      - Service display name
 * @param   {string}  serviceData.provider   - Provider / company name
 * @param   {number}  serviceData.cost       - Price per call in USDC
 * @param   {string}  [serviceData.category] - Category tag (default: 'General')
 * @returns {Object}  The newly created service entry
 * @throws  {Error}   If required fields are missing
 */
function registerService({ name, provider, cost, category = 'General' }) {
    if (!name || !provider || cost === undefined) {
        throw new Error('Missing required fields: name, provider, and cost are mandatory.');
    }

    const newService = {
        id: `srv-${Math.random().toString(36).substr(2, 6)}`,
        name,
        category,
        cost: Number(cost),
        currency: 'USDC',
        provider,
        trustScore: 50,    // New services start neutral
        latencyMs: 250,    // Default until measured
        status: 'Active',
        registeredAt: new Date().toISOString()
    };

    serviceRegistry.push(newService);

    console.log(
        `\n🏪 [Marketplace] New service registered: ` +
        `${newService.name} by ${newService.provider} at $${newService.cost} USDC`
    );

    return newService;
}

// ------------------------------------------
// 5. SERVICE STATUS MANAGEMENT
// ------------------------------------------

/**
 * Deactivates a service by ID (sets status to 'Inactive').
 *
 * @param   {string}  serviceId
 * @returns {boolean} true if found and deactivated, false otherwise
 */
function deactivateService(serviceId) {
    const svc = serviceRegistry.find(s => s.id === serviceId);
    if (!svc) return false;

    svc.status = 'Inactive';
    console.log(`🚫 [Marketplace] Deactivated service: ${svc.name} (${serviceId})`);
    return true;
}

/**
 * Updates the trust score and latency of a service (called after each
 * successful transaction to maintain reputation accuracy).
 *
 * @param   {string}  serviceId
 * @param   {number}  newTrustScore
 * @param   {number}  [measuredLatencyMs]
 * @returns {Object|null} Updated service, or null if not found
 */
function updateServiceMetrics(serviceId, newTrustScore, measuredLatencyMs) {
    const svc = serviceRegistry.find(s => s.id === serviceId);
    if (!svc) return null;

    svc.trustScore = Number(newTrustScore);
    if (measuredLatencyMs !== undefined) {
        // Exponential moving average for latency
        svc.latencyMs = Math.round(svc.latencyMs * 0.7 + measuredLatencyMs * 0.3);
    }

    return { ...svc };
}

// ------------------------------------------
// 6. REGISTRY STATS
// ------------------------------------------

/**
 * Returns high-level marketplace statistics.
 */
function getRegistryStats() {
    const active = serviceRegistry.filter(s => s.status === 'Active');
    const avgCost = active.reduce((s, svc) => s + svc.cost, 0) / (active.length || 1);
    const categories = [...new Set(active.map(s => s.category))];

    return {
        totalServices: serviceRegistry.length,
        activeServices: active.length,
        categories,
        averageCost: Number(avgCost.toFixed(4)),
        providers: [...new Set(serviceRegistry.map(s => s.provider))].length
    };
}

// ------------------------------------------
// EXPORTS
// ------------------------------------------
module.exports = {
    discoverServices,
    getAllServices,
    getServiceById,
    getProviderProfile,
    listProviders,
    registerService,
    deactivateService,
    updateServiceMetrics,
    getRegistryStats
};
