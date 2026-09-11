const algorandConfig = require('../../config/algorand');

/**
 * TrustChain: Block Explorer Link Generator
 * Generates clickable links to Pera Explorer / AlgoExplorer for
 * transactions, accounts, assets, and blocks on Algorand Testnet.
 *
 * Supports multiple explorers for redundancy and user preference.
 */

// EXPLORER CONFIGURATIONS
const EXPLORERS = {
    pera: {
        name: 'Pera Explorer',
        baseUrl: algorandConfig.EXPLORER.BASE_URL,
        paths: {
            transaction: '/tx/',
            account:     '/address/',
            asset:       '/asset/',
            block:       '/block/'
        }
    },
    algoexplorer: {
        name: 'AlgoExplorer',
        baseUrl: 'https://testnet.algoexplorer.io',
        paths: {
            transaction: '/tx/',
            account:     '/address/',
            asset:       '/asset/',
            block:       '/block/'
        }
    },
    allo: {
        name: 'Allo Explorer',
        baseUrl: 'https://app.dappflow.org/explorer',
        paths: {
            transaction: '/transaction/',
            account:     '/account/',
            asset:       '/asset/',
            block:       '/block/'
        }
    }
};

// Default explorer
let activeExplorer = 'pera';

// 1. TRANSACTION LINKS

/**
 * Generates a link to view a transaction on the block explorer.
 *
 * @param   {string}  txId      - Transaction ID / hash
 * @param   {string}  [explorer] - Explorer key (default: active explorer)
 * @returns {Object}  { url, explorerName, txId }
 */
function getTransactionUrl(txId, explorer) {
    const exp = EXPLORERS[explorer || activeExplorer];
    const url = `${exp.baseUrl}${exp.paths.transaction}${txId}`;

    return { url, explorerName: exp.name, txId };
}

/**
 * Generates transaction links for ALL configured explorers.
 * Useful for providing fallback links in the UI.
 *
 * @param   {string} txId
 * @returns {Array}  Array of { url, explorerName }
 */
function getAllTransactionUrls(txId) {
    return Object.entries(EXPLORERS).map(([key, exp]) => ({
        explorer: key,
        name: exp.name,
        url: `${exp.baseUrl}${exp.paths.transaction}${txId}`
    }));
}

// 2. ACCOUNT LINKS

/**
 * Generates a link to view an account on the block explorer.
 *
 * @param   {string}  address    - Algorand address
 * @param   {string}  [explorer] - Explorer key
 * @returns {Object}  { url, explorerName, address }
 */
function getAccountUrl(address, explorer) {
    const exp = EXPLORERS[explorer || activeExplorer];
    const url = `${exp.baseUrl}${exp.paths.account}${address}`;

    return { url, explorerName: exp.name, address };
}

// 3. ASSET LINKS

/**
 * Generates a link to view an ASA on the block explorer.
 *
 * @param   {number}  assetId    - Algorand Standard Asset ID
 * @param   {string}  [explorer] - Explorer key
 * @returns {Object}  { url, explorerName, assetId }
 */
function getAssetUrl(assetId, explorer) {
    const exp = EXPLORERS[explorer || activeExplorer];
    const url = `${exp.baseUrl}${exp.paths.asset}${assetId}`;

    return { url, explorerName: exp.name, assetId };
}

// 4. BLOCK LINKS

/**
 * Generates a link to view a specific block/round.
 *
 * @param   {number}  round      - Block round number
 * @param   {string}  [explorer] - Explorer key
 * @returns {Object}  { url, explorerName, round }
 */
function getBlockUrl(round, explorer) {
    const exp = EXPLORERS[explorer || activeExplorer];
    const url = `${exp.baseUrl}${exp.paths.block}${round}`;

    return { url, explorerName: exp.name, round };
}

// 5. BATCH LINK GENERATION

/**
 * Generates explorer links for an array of transaction IDs.
 * Perfect for bulk-enriching transaction lists for the dashboard.
 *
 * @param   {Array}  txIds - Array of transaction IDs
 * @returns {Array}  Array of { txId, url }
 */
function batchTransactionUrls(txIds) {
    return txIds.map(txId => ({
        txId,
        url: getTransactionUrl(txId).url
    }));
}

// 6. EXPLORER MANAGEMENT

/**
 * Sets the active explorer.
 *
 * @param {string} explorerKey - 'pera' | 'algoexplorer' | 'allo'
 */
function setActiveExplorer(explorerKey) {
    if (!EXPLORERS[explorerKey]) {
        throw new Error(`Unknown explorer: ${explorerKey}. Available: ${Object.keys(EXPLORERS).join(', ')}`);
    }
    activeExplorer = explorerKey;
    console.log(`🔗 [Explorer] Active explorer set to: ${EXPLORERS[explorerKey].name}`);
}

/**
 * Returns the list of available explorers.
 */
function getAvailableExplorers() {
    return Object.entries(EXPLORERS).map(([key, exp]) => ({
        key,
        name: exp.name,
        baseUrl: exp.baseUrl,
        active: key === activeExplorer
    }));
}

/**
 * Returns the currently active explorer.
 */
function getActiveExplorer() {
    return { key: activeExplorer, ...EXPLORERS[activeExplorer] };
}

// EXPORTS
module.exports = {
    getTransactionUrl,
    getAllTransactionUrls,
    getAccountUrl,
    getAssetUrl,
    getBlockUrl,
    batchTransactionUrls,
    setActiveExplorer,
    getAvailableExplorers,
    getActiveExplorer
};
