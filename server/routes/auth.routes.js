const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * TrustChain: Authentication Routes
 * Handles user login / wallet connection simulation and session verification.
 */

// 1. CONNECT WALLET / LOGIN (Public)
// Route: POST /api/auth/login
router.post('/login', (req, res) => {
    // In a real app, you would verify a cryptographic signature here.
    // For the hackathon, we accept the request and hand out our master token.
    console.log(`\n🔐 [Auth] User requested wallet connection.`);

    res.json({
        success: true,
        message: "Wallet connected securely.",
        // This is the exact token your auth middleware is looking for
        token: "Bearer asb-hackathon-token-2026",
        user: {
            id: "user_123",
            role: "admin",
            agentId: "agent_research_01",
            agentName: "ASB Research Agent"
        }
    });
});

// 2. VERIFY SESSION (Protected)
// Route: GET /api/auth/session
// Notice we put `requireAuth` here. The request MUST have the token to pass.
router.get('/session', requireAuth, (req, res) => {
    console.log(`\n🛡️ [Auth] Verified active session for Agent: ${req.agentSession.agentId}`);

    res.json({
        success: true,
        message: "Session is active and valid.",
        session: req.agentSession
    });
});

module.exports = router;