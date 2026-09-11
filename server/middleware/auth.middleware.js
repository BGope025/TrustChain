/**
 * TrustChain: authentication middleware
 * This checks if incoming requests have the correct API keys or tokens before letting them access sensitive agent/wallet routes.
 */

// we define a hardcoded secret for the hackathon MVP. 
// in the frontend code, we will make sure it always sends this exact token.
const MOCK_VALID_TOKEN = "Bearer asb-hackathon-token-2026";
const MOCK_VALID_API_KEY = "asb-demo-key";

const requireAuth = (req, res, next) => {
    // 1. look for the badge (Token or API Key) in the request headers
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];

    // 2. if they didn't bring any id at all -> kick them out (401)
    if (!authHeader && !apiKey) {
        console.log(`🚨 [Security] Blocked unauthorized request to ${req.originalUrl}`);
        return res.status(401).json({
            success: false,
            error: "Unauthorized: Missing API Key or Bearer Token"
        });
    }

    // 3. if the id matches our secret hackathon keys -> Let them in
    if (authHeader === MOCK_VALID_TOKEN || apiKey === MOCK_VALID_API_KEY) {

        // we attach a fake "session" to the request so the rest of the server knows who this is
        req.agentSession = {
            agentId: "agent_research_01",
            network: "algorand_testnet"
        };

        // next() is the magic code that opens the door to the actual route
        return next();
    }

    // 4. if they brought a fake/wrong id -> kick them out (403)
    console.log(`🚨 [Security] Invalid credentials used for ${req.originalUrl}`);
    return res.status(403).json({
        success: false,
        error: "Forbidden: Invalid Credentials provided."
    });
};

module.exports = {
    requireAuth
};