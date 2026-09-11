const { POLICIES } = require('../config/constants');
const algorandConfig = require('../config/algorand');
const env = require('../config/env');

/**
 * ASB-Pay: Wallet Service
 * Manages the AI agent's on-chain wallet state, USDC / ALGO balances,
 * spending policy guard-rails, and ASA opt-in tracking.
 *
 * In production these would read from the Algorand SDK; for the hackathon
 * MVP everything lives in-memory with realistic defaults.
 */

// ------------------------------------------
// IN-MEMORY WALLET STATE
// ------------------------------------------
const walletState = {
    address: env.AGENT_WALLET_ADDRESS || 'ALGO_7X9K2M4PN5Q8WTESTNETADDRESS99',
    algoBalance: 12.450,
    usdcBalance: 24.850,
    dailyLimit: POLICIES.MAX_DAILY_SPEND,
    maxPerTx: POLICIES.MAX_PER_TX_SPEND,
    spentToday: 0.012,
    currency: POLICIES.SUPPORTED_CURRENCY,
    network: algorandConfig.NODE.NETWORK,

    // Tracks which Algorand Standard Assets (ASAs) the wallet has opted into
    optedInAssets: [
        { id: algorandConfig.ASSETS.ALGO, name: 'ALGO',  optedAt: new Date().toISOString() },
        { id: algorandConfig.ASSETS.USDC, name: 'USDC',  optedAt: new Date().toISOString() }
    ],

    // Simplified keyring metadata (mnemonics never leave env.js)
    keyring: {
        algorithm: 'ed25519',
        derivation: 'algorand-kmd',
        hasBackup: !!env.AGENT_WALLET_MNEMONIC
    }
};

// Daily-spend reset tracker (resets every 24 h)
let lastResetDate = new Date().toDateString();

// ------------------------------------------
// INTERNAL HELPERS
// ------------------------------------------

/** Reset daily spend at midnight (lazy check). */
function _resetDailySpendIfNeeded() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        walletState.spentToday = 0;
        lastResetDate = today;
        console.log(`🔄 [Wallet] Daily spend counter reset.`);
    }
}

// ------------------------------------------
// 1. BALANCE & STATE QUERIES
// ------------------------------------------

/**
 * Returns a read-only snapshot of the current wallet state.
 * Automatically resets daily spend if the calendar day rolled over.
 */
function getWalletState() {
    _resetDailySpendIfNeeded();

    const remainingBudget = Math.max(0, walletState.dailyLimit - walletState.spentToday);

    return {
        address: walletState.address,
        balances: {
            algo: Number(walletState.algoBalance.toFixed(3)),
            usdc: Number(walletState.usdcBalance.toFixed(4))
        },
        policies: {
            dailyLimit: walletState.dailyLimit,
            maxPerTx: walletState.maxPerTx,
            spentToday: Number(walletState.spentToday.toFixed(4)),
            remainingBudget: Number(remainingBudget.toFixed(4)),
            autoApproveThreshold: POLICIES.AUTO_APPROVE_THRESHOLD
        },
        keyring: walletState.keyring,
        optedInAssets: walletState.optedInAssets,
        explorer: {
            accountUrl: algorandConfig.EXPLORER.getAccountUrl(walletState.address)
        }
    };
}

/**
 * Returns just the USDC balance (handy for quick budget checks).
 */
function getUsdcBalance() {
    return Number(walletState.usdcBalance.toFixed(4));
}

// ------------------------------------------
// 2. SPENDING & RECORDING
// ------------------------------------------

/**
 * Records a spend against the agent's daily limit and deducts from the
 * USDC balance.
 *
 * @param   {number} amount - USDC amount spent
 * @returns {Object} updated balances
 * @throws  {Error}  if spend exceeds per-tx or daily limits
 */
function recordSpend(amount) {
    _resetDailySpendIfNeeded();

    if (amount > walletState.maxPerTx) {
        throw new Error(
            `Transaction of $${amount} exceeds per-tx limit of $${walletState.maxPerTx}`
        );
    }

    const projectedDaily = walletState.spentToday + amount;
    if (projectedDaily > walletState.dailyLimit) {
        throw new Error(
            `Transaction would push daily spend to $${projectedDaily.toFixed(4)}, ` +
            `exceeding the $${walletState.dailyLimit} daily limit.`
        );
    }

    if (amount > walletState.usdcBalance) {
        throw new Error(
            `Insufficient USDC balance. Have $${walletState.usdcBalance.toFixed(4)}, ` +
            `need $${amount.toFixed(4)}.`
        );
    }

    walletState.usdcBalance -= amount;
    walletState.spentToday += amount;

    console.log(
        `💸 [Wallet] Deducted $${amount.toFixed(4)} USDC — ` +
        `Remaining balance: $${walletState.usdcBalance.toFixed(4)}, ` +
        `Daily spend: $${walletState.spentToday.toFixed(4)}/$${walletState.dailyLimit}`
    );

    return {
        algo: Number(walletState.algoBalance.toFixed(3)),
        usdc: Number(walletState.usdcBalance.toFixed(4)),
        spentToday: Number(walletState.spentToday.toFixed(4))
    };
}

// ------------------------------------------
// 3. FUNDING (Testnet Faucet)
// ------------------------------------------

/**
 * Simulates a testnet faucet drip — adds USDC + gas ALGO to the wallet.
 *
 * @param   {number} [usdcAmount=10] - USDC to add
 * @param   {number} [algoAmount=2]  - ALGO gas to add
 * @returns {Object} updated balances
 */
function fundWallet(usdcAmount = 10, algoAmount = 2) {
    walletState.usdcBalance += usdcAmount;
    walletState.algoBalance += algoAmount;

    console.log(
        `\n💳 [Wallet] Faucet drip: +$${usdcAmount.toFixed(2)} USDC, ` +
        `+${algoAmount.toFixed(1)} ALGO`
    );

    return {
        algo: Number(walletState.algoBalance.toFixed(3)),
        usdc: Number(walletState.usdcBalance.toFixed(4))
    };
}

// ------------------------------------------
// 4. POLICY MANAGEMENT
// ------------------------------------------

/**
 * Live-updates the agent's spending policies (for demo toggling).
 *
 * @param   {Object}  newPolicies
 * @param   {number}  [newPolicies.dailyLimit]
 * @param   {number}  [newPolicies.maxPerTx]
 * @returns {Object}  updated policies
 */
function updatePolicies({ dailyLimit, maxPerTx } = {}) {
    if (dailyLimit !== undefined) walletState.dailyLimit = Number(dailyLimit);
    if (maxPerTx  !== undefined) walletState.maxPerTx  = Number(maxPerTx);

    console.log(
        `🛡️ [Wallet] Policies updated → Daily: $${walletState.dailyLimit}, ` +
        `Max/Tx: $${walletState.maxPerTx}`
    );

    return {
        dailyLimit: walletState.dailyLimit,
        maxPerTx: walletState.maxPerTx,
        spentToday: Number(walletState.spentToday.toFixed(4))
    };
}

// ------------------------------------------
// 5. ASA OPT-IN MANAGEMENT
// ------------------------------------------

/**
 * Opts the wallet into an Algorand Standard Asset (ASA).
 *
 * @param   {number} assetId   - The ASA ID on Algorand
 * @param   {string} assetName - Human-readable name
 * @returns {Object} opt-in confirmation
 */
function optInToAsset(assetId, assetName = 'Unknown') {
    const alreadyOptedIn = walletState.optedInAssets.some(a => a.id === assetId);

    if (alreadyOptedIn) {
        return { success: false, message: `Already opted into asset ${assetId} (${assetName})` };
    }

    walletState.optedInAssets.push({
        id: assetId,
        name: assetName,
        optedAt: new Date().toISOString()
    });

    console.log(`🔗 [Wallet] Opted into ASA ${assetId} (${assetName})`);

    return { success: true, assetId, assetName, totalOptedIn: walletState.optedInAssets.length };
}

/**
 * Returns the list of ASAs the wallet is currently opted into.
 */
function getOptedInAssets() {
    return [...walletState.optedInAssets];
}

// ------------------------------------------
// 6. KEYRING INFO
// ------------------------------------------

/**
 * Returns non-sensitive metadata about the wallet's keyring.
 * (Mnemonics and private keys never leave env.js.)
 */
function getKeyringInfo() {
    return {
        ...walletState.keyring,
        address: walletState.address,
        network: walletState.network
    };
}

// ------------------------------------------
// EXPORTS
// ------------------------------------------
module.exports = {
    getWalletState,
    getUsdcBalance,
    recordSpend,
    fundWallet,
    updatePolicies,
    optInToAsset,
    getOptedInAssets,
    getKeyringInfo
};
