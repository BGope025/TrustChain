const walletService = require('../services/wallet.service');

/**
 * TrustChain: Wallet Controller
 * Handles HTTP request/response for agent wallet, balance, policy,
 * and ASA opt-in endpoints. Delegates all logic to wallet.service.js.
 */

// 1. GET WALLET DETAILS & POLICY STATUS
// Handler for: GET /api/wallet
function getWallet(req, res) {
    const wallet = walletService.getWalletState();

    res.json({
        success: true,
        wallet
    });
}

// 2. FUND / TOP-UP WALLET (Demo Faucet)
// Handler for: POST /api/wallet/fund
function fundWallet(req, res) {
    const usdcAmount = Number(req.body.amount) || 10.0;
    const algoAmount = Number(req.body.algoAmount) || 2.0;

    const balances = walletService.fundWallet(usdcAmount, algoAmount);

    console.log(`\n💳 [Wallet Controller] Faucet drip: +$${usdcAmount.toFixed(2)} USDC & +${algoAmount.toFixed(1)} ALGO`);

    res.json({
        success: true,
        message: `Successfully topped up wallet with ${usdcAmount} USDC and ${algoAmount} ALGO.`,
        balances
    });
}

// 3. UPDATE SPENDING POLICY
// Handler for: POST /api/wallet/policy
function updatePolicy(req, res) {
    const { dailyLimit, maxPerTx } = req.body;

    const policies = walletService.updatePolicies({ dailyLimit, maxPerTx });

    res.json({
        success: true,
        message: 'Agent spending policies updated successfully.',
        policies
    });
}

// 4. OPT-IN TO ASA (Algorand Standard Asset)
// Handler for: POST /api/wallet/opt-in
function optInToAsset(req, res) {
    const { assetId, assetName } = req.body;

    if (!assetId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required field: assetId'
        });
    }

    const result = walletService.optInToAsset(Number(assetId), assetName);

    if (!result.success) {
        return res.status(409).json({
            success: false,
            message: result.message
        });
    }

    res.json({
        success: true,
        message: `Opted into ASA ${assetId} (${assetName || 'Unknown'}).`,
        ...result
    });
}

// 5. GET OPTED-IN ASSETS
// Handler for: GET /api/wallet/assets
function getOptedInAssets(req, res) {
    const assets = walletService.getOptedInAssets();

    res.json({
        success: true,
        count: assets.length,
        assets
    });
}

// 6. GET KEYRING INFO
// Handler for: GET /api/wallet/keyring
function getKeyringInfo(req, res) {
    const keyring = walletService.getKeyringInfo();

    res.json({
        success: true,
        keyring
    });
}

// EXPORTS
module.exports = {
    getWallet,
    fundWallet,
    updatePolicy,
    optInToAsset,
    getOptedInAssets,
    getKeyringInfo
};
