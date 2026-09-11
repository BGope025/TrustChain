const algorandConfig = require('../../config/algorand');
const algodClient = require('./client');
const wallet = require('./wallet');

/**
 * TrustChain: Algorand Transaction Builder & Submitter
 * Constructs, signs, and submits transactions on the Algorand network.
 * Supports single payments, ASA transfers, and atomic groups.
 */

// TRANSACTION HISTORY (local ledger mirror)
const txLedger = [];

// 1. BUILD PAYMENT TRANSACTION (ALGO)

/**
 * Builds a native ALGO payment transaction.
 *
 * @param   {Object}  params
 * @param   {string}  params.to      - Recipient Algorand address
 * @param   {number}  params.amount  - Amount in ALGO
 * @param   {string}  [params.note]  - Optional note (max 1KB)
 * @returns {Object}  Unsigned transaction object
 */
async function buildPayment({ to, amount, note = '' }) {
    const { algod } = algodClient.init();
    const suggestedParams = await algod.getTransactionParams();
    const from = wallet.getWalletInfo().address;

    return {
        type: 'pay',
        from,
        to,
        amount: Math.floor(amount * 1e6), // ALGO → microAlgos
        fee: suggestedParams.fee,
        flatFee: suggestedParams.flatFee,
        firstRound: suggestedParams.firstRound,
        lastRound: suggestedParams.lastRound,
        genesisID: suggestedParams.genesisID,
        genesisHash: suggestedParams.genesisHash,
        note: note ? new TextEncoder().encode(note) : undefined
    };
}

// 2. BUILD ASA TRANSFER (USDC)

/**
 * Builds an Algorand Standard Asset transfer transaction.
 *
 * @param   {Object}  params
 * @param   {string}  params.to       - Recipient Algorand address
 * @param   {number}  params.amount   - Amount in human units (e.g. 0.002 USDC)
 * @param   {number}  [params.assetId] - ASA ID (defaults to USDC)
 * @param   {string}  [params.note]
 * @returns {Object}  Unsigned transaction object
 */
async function buildAsaTransfer({ to, amount, assetId, note = '' }) {
    const { algod } = algodClient.init();
    const suggestedParams = await algod.getTransactionParams();
    const from = wallet.getWalletInfo().address;

    return {
        type: 'axfer',
        from,
        to,
        assetIndex: assetId || algorandConfig.ASSETS.USDC,
        amount: Math.floor(amount * 1e6), // 6-decimal asset → base units
        fee: suggestedParams.fee,
        flatFee: suggestedParams.flatFee,
        firstRound: suggestedParams.firstRound,
        lastRound: suggestedParams.lastRound,
        genesisID: suggestedParams.genesisID,
        genesisHash: suggestedParams.genesisHash,
        note: note ? new TextEncoder().encode(note) : undefined
    };
}

// 3. BUILD ATOMIC GROUP

/**
 * Assigns a group ID to an array of transactions, making them atomic.
 * All transactions in the group either succeed or fail together.
 *
 * @param   {Array}  txns - Array of unsigned transaction objects
 * @returns {Array}  Transactions with groupId assigned
 */
function buildAtomicGroup(txns) {
    const groupId = `group_${Math.random().toString(36).substring(2, 10)}`;

    return txns.map((txn, index) => ({
        ...txn,
        group: groupId,
        groupIndex: index,
        groupSize: txns.length
    }));
}

// 4. SIGN & SUBMIT

/**
 * Signs and submits a single transaction.
 *
 * @param   {Object}  txn - Unsigned transaction
 * @returns {Object}  { txId, confirmedRound, explorerUrl }
 */
async function signAndSubmit(txn) {
    const { algod } = algodClient.init();

    // Sign
    const signed = await wallet.signTransaction(txn);

    // Submit
    const submitResult = await algod.sendRawTransaction(signed.signedTxn);

    // Wait for confirmation
    const confirmation = await algod.waitForConfirmation(submitResult.txId, 4);

    const result = {
        txId: submitResult.txId,
        confirmedRound: confirmation['confirmed-round'],
        from: txn.from,
        to: txn.to,
        amount: txn.type === 'pay' ? txn.amount / 1e6 : txn.amount / 1e6,
        type: txn.type,
        explorerUrl: algorandConfig.EXPLORER.getTxUrl(submitResult.txId),
        submittedAt: new Date().toISOString()
    };

    // Record in local ledger
    txLedger.push(result);

    console.log(`✅ [Transactions] Confirmed in round ${result.confirmedRound}: ${result.txId}`);

    return result;
}

/**
 * Signs and submits an atomic group of transactions.
 *
 * @param   {Array}  txns - Array of unsigned transactions (already grouped)
 * @returns {Object} { txIds, confirmedRound, groupSize }
 */
async function signAndSubmitGroup(txns) {
    const { algod } = algodClient.init();

    // Sign all
    const signedGroup = await wallet.signGroup(txns);

    // Submit group
    const firstTxId = signedGroup.txIds[0];
    await algod.sendRawTransaction(signedGroup.signedGroup);

    // Wait for confirmation
    const confirmation = await algod.waitForConfirmation(firstTxId, 4);

    const result = {
        txIds: signedGroup.txIds,
        confirmedRound: confirmation['confirmed-round'],
        groupSize: txns.length,
        explorerUrl: algorandConfig.EXPLORER.getTxUrl(firstTxId),
        submittedAt: new Date().toISOString()
    };

    // Record each tx
    for (const txId of signedGroup.txIds) {
        txLedger.push({ txId, confirmedRound: result.confirmedRound, type: 'group' });
    }

    console.log(`✅ [Transactions] Atomic group confirmed: ${txns.length} txns in round ${result.confirmedRound}`);

    return result;
}

// 5. CONVENIENCE: SEND USDC PAYMENT

/**
 * One-call helper to build, sign, and submit a USDC payment.
 *
 * @param   {string} to     - Recipient address
 * @param   {number} amount - USDC amount
 * @param   {string} [memo] - Payment memo
 * @returns {Object} Transaction result
 */
async function sendUsdcPayment(to, amount, memo = '') {
    const txn = await buildAsaTransfer({
        to,
        amount,
        assetId: algorandConfig.ASSETS.USDC,
        note: memo || `x402_payment_${Date.now()}`
    });

    return signAndSubmit(txn);
}

// 6. LEDGER QUERIES

/**
 * Returns the local transaction ledger.
 */
function getLocalLedger(limit = 50) {
    return [...txLedger].reverse().slice(0, limit);
}

// EXPORTS
module.exports = {
    buildPayment,
    buildAsaTransfer,
    buildAtomicGroup,
    signAndSubmit,
    signAndSubmitGroup,
    sendUsdcPayment,
    getLocalLedger
};
