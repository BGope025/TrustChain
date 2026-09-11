const express = require('express');
const router = express.Router();

// 1. IMPORT ALL SUB-ROUTERS
const analysisRoutes = require('./analytics.routes');
const authRoutes = require('./auth.routes');
const agentRoutes = require('./agent.routes');
const walletRoutes = require('./wallet.routes');
const marketplaceRoutes = require('./marketplace.routes');
const paymentRoutes = require('./payment.routes');
const reputationRoutes = require('./reputation.routes');
const transactionRoutes = require('./transaction.routes');

// 2. ROOT API HEALTH CHECK
// Accessible at: GET /api
router.get('/', (req, res) => {
    res.json({
        service: "ASB-Pay API Gateway",
        status: "Operational",
        version: "1.0.0",
        endpoints: {
            auth: "/api/auth",
            agent: "/api/agent",
            wallet: "/api/wallet",
            marketplace: "/api/marketplace",
            payment: "/api/payment",
            reputation: "/api/reputation",
            transactions: "/api/transactions"
        },
        timestamp: new Date().toISOString()
    });
});

// 3. MOUNT ALL SUB-ROUTES
router.use('/analysis', analysisRoutes);
router.use('/auth', authRoutes);
router.use('/agent', agentRoutes);
router.use('/wallet', walletRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/payment', paymentRoutes);
router.use('/reputation', reputationRoutes);
router.use('/transactions', transactionRoutes);

module.exports = router;