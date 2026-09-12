const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * TrustChain: Authentication Routes
 * Handles user login / wallet connection simulation and session verification.
 */

// 0. ROOT FALLBACK (Public)
// Route: GET /api/auth
// Prevents the 404 error when the frontend pings the base route
router.get('/', (req, res) => {
    res.json({
        service: "TrustChain Auth Gateway",
        status: "active",
        supportedMethods: ["POST /api/auth/login", "POST /api/auth/refresh", "GET /api/auth/session", "GET /api/auth/me"]
    });
});

// 1. CONNECT WALLET / LOGIN (Public)
// Route: POST /api/auth/login
router.post('/login', (req, res) => {
    const { walletAddress } = req.body;
    console.log(`\n🔐 [Auth] User requested wallet connection.`);

    // Use provided wallet from the UI, or fallback to your env default
    const addressToUse = walletAddress || process.env.AGENT_WALLET_ADDRESS || "YMSRXTYJA6SCU6OBPXGY2AO2OE6BAIF24JLGSZZBPRD5JRYWZV62LYA4FQ";

    res.json({
        success: true,
        message: "Wallet connected securely.",
        // Kept original token string to satisfy your custom auth middleware
        token: "Bearer asb-hackathon-token-2026",
        
        // --- NEW FIELDS REQUESTED BY FRONTEND ---
        tokenType: "Bearer",
        expiresIn: "24h",
        agent: {
            id: "AGENT-ALGO-01",
            walletAddress: addressToUse
        },
        
        // --- ORIGINAL FIELDS (Preserved) ---
        user: {
            id: "user_123",
            role: "admin",
            agentId: "agent_research_01",
            agentName: "ASB Research Agent"
        }
    });
});

// 2. REFRESH TOKEN (Public/Protected)
// Route: POST /api/auth/refresh
// New endpoint requested by the frontend UI
router.post('/refresh', (req, res) => {
    const authHeader = req.headers.authorization;
    const currentToken = authHeader || "Bearer asb-hackathon-token-2026";
    
    console.log(`\n🔄 [Auth] Token refresh requested.`);

    res.json({
        success: true,
        token: currentToken,
        tokenType: "Bearer",
        expiresIn: "24h"
    });
});

// 3. VERIFY SESSION (Protected)
// Route: GET /api/auth/session
// Notice we put `requireAuth` here. The request MUST have the token to pass.
router.get('/session', requireAuth, (req, res) => {
    console.log(`\n🛡️ [Auth] Verified active session for Agent: ${req.agentSession?.agentId || 'Unknown'}`);

    res.json({
        success: true,
        message: "Session is active and valid.",
        session: req.agentSession
    });
});

// 4. ME ALIAS (Protected)
// Route: GET /api/auth/me
// An alias to session validation that the frontend explicitly requested
router.get('/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        authenticated: true,
        agent: {
            id: "AGENT-ALGO-01",
            walletAddress: process.env.AGENT_WALLET_ADDRESS || "YMSRXTYJA6SCU6OBPXGY2AO2OE6BAIF24JLGSZZBPRD5JRYWZV62LYA4FQ"
        },
        session: req.agentSession
    });
});

module.exports = router;