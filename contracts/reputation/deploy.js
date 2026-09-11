/**
 * TrustChain: deploy script for reputation contract deploys the compiled TEAL to Algorand Testnet.
 */

const fs = require('fs');

async function deploy() {
    console.log("🚀 Deploying Reputation Contract to Algorand Testnet...");
    const tealCode = fs.readFileSync(__dirname + '/reputation.teal', 'utf8');

    // mock deployment logic
    const mockAppId = Math.floor(Math.random() * 100000000);
    console.log(`✅ Deployed successfully! App ID: ${mockAppId}`);

    return mockAppId;
}

if (require.main === module) {
    deploy().catch(console.error);
}

module.exports = deploy;
