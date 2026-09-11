const express = require('express');
const router = express.Router();

/**
 * TrustChain: Marketplace Routes
 * Acts as the service discovery layer where the AI agent finds 
 * trusted APIs to purchase data from.
 */

// MOCK DATABASE: The Service Directory
// This is the array of tools your AI can choose from during the demo.
let serviceRegistry = [
    {
        id: "srv-market-01",
        name: "MarketData Pro",
        category: "Finance",
        cost: 0.002,
        currency: "USDC",
        provider: "Algorand Finance",
        trustScore: 97,
        latencyMs: 120,
        status: "Active"
    },
    {
        id: "srv-news-01",
        name: "NewsPulse API",
        category: "Media",
        cost: 0.004,
        currency: "USDC",
        provider: "Data Oracle",
        trustScore: 94,
        latencyMs: 210,
        status: "Active"
    },
    {
        id: "srv-risk-01",
        name: "RiskAI Engine",
        category: "Analytics",
        cost: 0.006,
        currency: "USDC",
        provider: "Trust Analytics",
        trustScore: 98,
        latencyMs: 315,
        status: "Active"
    },
    {
        id: "srv-vision-01",
        name: "Vision OCR",
        category: "AI",
        cost: 0.003,
        currency: "USDC",
        provider: "Neural Net Co",
        trustScore: 82, // A lower score so the AI knows to avoid it if strict policies are on!
        latencyMs: 450,
        status: "Active"
    }
];

// 1. GET ALL SERVICES (Service Discovery)
// Route: GET /api/marketplace
router.get('/', (req, res) => {
    // Optional: Allow the frontend to filter by category (e.g., /api/marketplace?category=Finance)
    const { category } = req.query;

    let results = serviceRegistry;
    if (category) {
        results = serviceRegistry.filter(s => s.category.toLowerCase() === category.toLowerCase());
    }

    console.log(`\n🔍 [Marketplace] Agent searched for available services. Found: ${results.length}`);

    res.json({
        success: true,
        count: results.length,
        services: results
    });
});

// 2. GET SINGLE SERVICE DETAILS
// Route: GET /api/marketplace/:id
router.get('/:id', (req, res) => {
    const serviceId = req.params.id;
    const service = serviceRegistry.find(s => s.id === serviceId);

    if (!service) {
        return res.status(404).json({
            success: false,
            error: "Service not found in the registry."
        });
    }

    res.json({
        success: true,
        service: service
    });
});

// 3. REGISTER A NEW SERVICE (For the Providers)
// Route: POST /api/marketplace/register
// This shows the judges that your platform is a two-sided marketplace.
// Providers can list their own APIs for the AI to buy.
router.post('/register', (req, res) => {
    const { name, category, cost, provider } = req.body;

    if (!name || !cost || !provider) {
        return res.status(400).json({
            success: false,
            error: "Missing required fields. Provide name, cost, and provider."
        });
    }

    const newService = {
        id: `srv-${Math.random().toString(36).substr(2, 6)}`,
        name: name,
        category: category || "General",
        cost: Number(cost),
        currency: "USDC",
        provider: provider,
        trustScore: 50, // New services start with a neutral trust score
        latencyMs: 250,
        status: "Active"
    };

    serviceRegistry.push(newService);
    console.log(`\n🏪 [Marketplace] New service registered: ${newService.name} at $${newService.cost}`);

    res.json({
        success: true,
        message: "Service successfully registered on ASB-Pay Marketplace.",
        service: newService
    });
});

module.exports = router;