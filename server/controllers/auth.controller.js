/**
 * TrustChain: Authentication Controller
 * Handles wallet connection (login) and session verification.
 * For the hackathon MVP, authentication is simulated with a
 * hardcoded token — in production this would verify Algorand
 * wallet signatures.
 */

// MOCK SESSION STORE
const sessions = new Map();

// 1. CONNECT WALLET / LOGIN
// Handler for: POST /api/auth/login
function login(req, res) {
    const { walletAddress, signature } = req.body;

    console.log(`\n🔐 [Auth Controller] User requested wallet connection.`);

    // In production: verify the cryptographic signature against the wallet address.
    // For hackathon: we accept all connections and issue our master token.

    const userId = 'user_123';
    const agentId = 'agent_research_01';
    const token = 'Bearer asb-hackathon-token-2026';

    // Store session
    sessions.set(userId, {
        userId,
        agentId,
        walletAddress: walletAddress || 'ALGO_7X9K2M4PN5Q8WTESTNETADDRESS99',
        role: 'admin',
        connectedAt: new Date().toISOString()
    });

    console.log(`✅ [Auth Controller] Wallet connected for ${agentId}`);

    res.json({
        success: true,
        message: 'Wallet connected securely.',
        token,
        user: {
            id: userId,
            role: 'admin',
            agentId,
            agentName: 'ASB Research Agent'
        }
    });
}

// 2. VERIFY SESSION
// Handler for: GET /api/auth/session
function verifySession(req, res) {
    const agentId = req.agentSession.agentId;

    console.log(`\n🛡️ [Auth Controller] Verified active session for Agent: ${agentId}`);

    res.json({
        success: true,
        message: 'Session is active and valid.',
        session: req.agentSession
    });
}

// 3. LOGOUT / DISCONNECT WALLET
// Handler for: POST /api/auth/logout
function logout(req, res) {
    const agentId = req.agentSession.agentId;

    // Remove session if stored
    for (const [key, session] of sessions) {
        if (session.agentId === agentId) {
            sessions.delete(key);
            break;
        }
    }

    console.log(`\n🔓 [Auth Controller] Session terminated for Agent: ${agentId}`);

    res.json({
        success: true,
        message: 'Wallet disconnected and session terminated.'
    });
}

// ==========================================
// 4. GET CURRENT USER INFO
// Handler for: GET /api/auth/me
// ==========================================
function getCurrentUser(req, res) {
    res.json({
        success: true,
        user: {
            id: 'user_123',
            role: 'admin',
            agentId: req.agentSession.agentId,
            agentName: 'ASB Research Agent',
            network: req.agentSession.network
        }
    });
}

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
    login,
    verifySession,
    logout,
    getCurrentUser
};
