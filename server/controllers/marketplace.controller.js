const marketplaceService = require('../services/marketplace.service');

/**
 * TrustChain: Marketplace Controller
 * Handles HTTP request/response for service discovery, provider profiles,
 * and service registration. Delegates all logic to marketplace.service.js.
 */

// 1. GET ALL SERVICES (Service Discovery)
// Handler for: GET /api/marketplace
function getAllServices(req, res) {
    const { category } = req.query;
    const services = marketplaceService.getAllServices(category);

    console.log(`\n🔍 [Marketplace Controller] Agent searched for services. Found: ${services.length}`);

    res.json({
        success: true,
        count: services.length,
        services
    });
}

// 2. DISCOVER TRUSTED SERVICES (Filtered)
// Handler for: GET /api/marketplace/discover
function discoverServices(req, res) {
    const filters = {};

    if (req.query.category) filters.category = req.query.category;
    if (req.query.minTrustScore) filters.minTrustScore = Number(req.query.minTrustScore);
    if (req.query.maxCost) filters.maxCost = Number(req.query.maxCost);
    if (req.query.maxLatencyMs) filters.maxLatencyMs = Number(req.query.maxLatencyMs);

    const services = marketplaceService.discoverServices(filters);

    res.json({
        success: true,
        count: services.length,
        filters,
        services
    });
}

// 3. GET SINGLE SERVICE DETAILS
// Handler for: GET /api/marketplace/:id
function getServiceById(req, res) {
    const service = marketplaceService.getServiceById(req.params.id);

    if (!service) {
        return res.status(404).json({
            success: false,
            error: 'Service not found in the registry.'
        });
    }

    res.json({
        success: true,
        service
    });
}

// 4. REGISTER A NEW SERVICE
// Handler for: POST /api/marketplace/register
function registerService(req, res) {
    const { name, category, cost, provider } = req.body;

    if (!name || !cost || !provider) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields. Provide name, cost, and provider.'
        });
    }

    try {
        const newService = marketplaceService.registerService({
            name,
            category,
            cost: Number(cost),
            provider
        });

        res.json({
            success: true,
            message: 'Service successfully registered on ASB-Pay Marketplace.',
            service: newService
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

// 5. GET PROVIDER PROFILE
// Handler for: GET /api/marketplace/provider/:name
function getProviderProfile(req, res) {
    const profile = marketplaceService.getProviderProfile(req.params.name);

    if (!profile) {
        return res.status(404).json({
            success: false,
            error: 'Provider not found in the registry.'
        });
    }

    res.json({
        success: true,
        profile
    });
}

// 6. LIST ALL PROVIDERS
// Handler for: GET /api/marketplace/providers
function listProviders(req, res) {
    const providers = marketplaceService.listProviders();

    res.json({
        success: true,
        count: providers.length,
        providers
    });
}

// 7. DEACTIVATE A SERVICE
// Handler for: POST /api/marketplace/:id/deactivate
function deactivateService(req, res) {
    const success = marketplaceService.deactivateService(req.params.id);

    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Service not found.'
        });
    }

    res.json({
        success: true,
        message: `Service ${req.params.id} deactivated.`
    });
}

// 8. GET REGISTRY STATS
// Handler for: GET /api/marketplace/stats
function getRegistryStats(req, res) {
    const stats = marketplaceService.getRegistryStats();

    res.json({
        success: true,
        stats
    });
}

// EXPORTS
module.exports = {
    getAllServices,
    discoverServices,
    getServiceById,
    registerService,
    getProviderProfile,
    listProviders,
    deactivateService,
    getRegistryStats
};
