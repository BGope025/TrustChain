const express = require('express');
const router = express.Router();

// Import our x402 payment bouncer
const { requireX402Payment } = require('../middleware/x402.middleware');

/**
 * TrustChain: mock premium data APIs (Analysis)
 * These routes represent the 3rd-party data providers. They are protected by the x402 middleware, meaning they will return an HTTP 402 error unless the AI agent provides a valid payment receipt in the headers.
 */

// 1. marketing data API (Cost: $0.002 USDC)
// Route: GET /api/analysis/market
router.get('/market', requireX402Payment({ cost: 0.002, serviceName: "MarketData Pro" }), (req, res) => {
    // If the code reaches here, the x402 middleware verified the payment!
    console.log(`📊 [Provider] Serving premium Market Data to Agent...`);

    res.json({
        success: true,
        source: "MarketData Pro",
        data: {
            asset: "ALGO",
            currentPrice: 0.185,
            volume24h: "45.2M",
            trend: "Bullish",
            movingAverage50d: 0.172
        },
        receiptValidated: true
    });
});

// 2. NEWS SENTIMENT API (Cost: $0.004 USDC)
// Route: GET /api/analysis/news
router.get('/news', requireX402Payment({ cost: 0.004, serviceName: "NewsPulse API" }), (req, res) => {
    console.log(`📰 [Provider] Serving premium News Sentiment to Agent...`);

    res.json({
        success: true,
        source: "NewsPulse API",
        data: {
            target: "Tech Sector",
            overallSentiment: "Positive",
            sentimentScore: 0.81,
            topKeywords: ["Adoption", "Partnership", "Growth"],
            analyzedArticles: 142
        },
        receiptValidated: true
    });
});

// 3. RISK ANALYSIS ENGINE (Cost: $0.006 USDC)
// Route: GET /api/analysis/risk
router.get('/risk', requireX402Payment({ cost: 0.006, serviceName: "RiskAI Engine" }), (req, res) => {
    console.log(`⚠️ [Provider] Serving premium Risk Analysis to Agent...`);

    res.json({
        success: true,
        source: "RiskAI Engine",
        data: {
            riskLevel: "Low to Moderate",
            riskScore: 62, // Out of 100
            flags: ["Regulatory clarity improving", "Slight volume dip on weekends"],
            confidence: 94.5
        },
        receiptValidated: true
    });
});

module.exports = router;