const env = require('../../config/env');
const algorandConfig = require('../../config/algorand');
const algodClient = require('./client');

/**
 * TrustChain: Algorand Wallet Manager
 * Handles signing, account management, and mnemonic-based key derivation
 * for the AI agent's Algorand wallet.
 *
 * Security: Private keys / mnemonics NEVER leave this module.
 * Only public addresses and signed transaction bytes are exposed.
 */

// WALLET STATE
const walletState = {
    address: env.AGENT_WALLET_ADDRESS || 'ALGO_7X9K2M4PN5Q8WTESTNETADDRESS99',
    hasMnemonic: !!env.AGENT_WALLET_MNEMONIC,
    algorithm: 'ed25519',
    derivation: 'algorand-kmd',
    createdAt: new Date().toISOString()
};

// 1. GET WALLET INFO (public data only)

/**
 * Returns non-sensitive wallet metadata.
 * Mnemonics and private keys are NEVER included.
 *
 * @returns {Object} { address, hasMnemonic, algorithm, network }
 */
function getWalletInfo() {
    return {
        address: walletState.address,
        hasMnemonic: walletState.hasMnemonic,
        algorithm: walletState.algorithm,
        derivation: walletState.derivation,
        network: algorandConfig.NODE.NETWORK,
        explorerUrl: algorandConfig.EXPLORER.getAccountUrl(walletState.address)
    };
}

// 2. SIGN TRANSACTION

/**
 * Signs a transaction with the agent's private key.
 *
 * In production this would use `algosdk.signTransaction()`.
 * For the hackathon we return mock signed bytes.
 *
 * @param   {Object}  txn - The unsigned transaction object
 * @returns {Object}  { signedTxn, txId, signer }
 * @throws  {Error}   If no mnemonic is configured
 */
async function signTransaction(txn) {
    if (!walletState.hasMnemonic) {
        throw new Error(
            'Cannot sign: AGENT_WALLET_MNEMONIC is not configured in .env. ' +
            'Please set it up or use the testnet faucet.'
        );
    }

    // Mock signature generation
    const txId = txn.txId || `TX_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const signedBytes = Buffer.from(`signed_${txId}_${Date.now()}`).toString('base64');

    console.log(`✍️  [Wallet] Signed transaction: ${txId}`);

    return {
        signedTxn: signedBytes,
        txId,
        signer: walletState.address,
        signedAt: new Date().toISOString()
    };
}

/**
 * Signs multiple transactions atomically (Algorand group transactions).
 *
 * @param   {Array}  txns - Array of unsigned transaction objects
 * @returns {Object} { signedGroup, txIds, signer }
 */
async function signGroup(txns) {
    if (!walletState.hasMnemonic) {
        throw new Error('Cannot sign: AGENT_WALLET_MNEMONIC is not configured.');
    }

    const signedGroup = [];
    const txIds = [];

    for (const txn of txns) {
        const signed = await signTransaction(txn);
        signedGroup.push(signed.signedTxn);
        txIds.push(signed.txId);
    }

    console.log(`✍️  [Wallet] Signed atomic group of ${txns.length} transactions`);

    return {
        signedGroup,
        txIds,
        signer: walletState.address,
        groupSize: txns.length,
        signedAt: new Date().toISOString()
    };
}

// 3. ACCOUNT BALANCE

/**
 * Fetches the on-chain balance for the agent wallet.
 *
 * @returns {Object} { address, algo, usdc, minBalance }
 */
async function getBalance() {
    const { algod } = algodClient.init();
    const accountInfo = await algod.accountInformation(walletState.address);

    const algoBalance = accountInfo.amount / 1e6;  // microAlgos → ALGO
    const usdcAsset = (accountInfo.assets || []).find(
        a => a['asset-id'] === algorandConfig.ASSETS.USDC
    );
    const usdcBalance = usdcAsset ? usdcAsset.amount / 1e6 : 0;

    return {
        address: walletState.address,
        algo: Number(algoBalance.toFixed(6)),
        usdc: Number(usdcBalance.toFixed(6)),
        minBalance: accountInfo['min-balance'] / 1e6,
        network: algorandConfig.NODE.NETWORK
    };
}

// 4. OPT-IN TO ASA

/**
 * Creates and signs an opt-in transaction for an Algorand Standard Asset.
 *
 * @param   {number} assetId - The ASA ID to opt into
 * @returns {Object} { txId, assetId, status }
 */
async function optInToAsset(assetId) {
    const { algod } = algodClient.init();
    const params = await algod.getTransactionParams();

    // Build opt-in transaction (0-amount ASA transfer to self)
    const optInTxn = {
        type: 'axfer',
        from: walletState.address,
        to: walletState.address,
        assetIndex: assetId,
        amount: 0,
        ...params
    };

    const signed = await signTransaction({ ...optInTxn, txId: undefined });
    const result = await algod.sendRawTransaction(signed.signedTxn);

    console.log(`🔗 [Wallet] Opted into ASA ${assetId} — Tx: ${result.txId}`);

    return {
        txId: result.txId,
        assetId,
        status: 'opted_in',
        explorerUrl: algorandConfig.EXPLORER.getTxUrl(result.txId)
    };
}

// 5. ADDRESS VALIDATION

/**
 * Validates an Algorand address format (58-character base32).
 *
 * @param   {string}  address
 * @returns {boolean} true if valid format
 */
function isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    // Algorand addresses are 58 characters, uppercase A-Z and 2-7
    return /^[A-Z2-7]{58}$/.test(address);
}

// EXPORTS
module.exports = {
    getWalletInfo,
    signTransaction,
    signGroup,
    getBalance,
    optInToAsset,
    isValidAddress
};
