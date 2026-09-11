/**
 * ASB-Pay Service: CoinAPI Cryptocurrency APIs
 * Provider: CoinAPI
 * Price: $0.0001 per call (marketplace unit price)
 */

const fetchCoinapi = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from CoinAPI Cryptocurrency APIs...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://www.coinapi.io/');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from coinapi:`, error.message);
        return null;
    }
};

module.exports = { fetchCoinapi };
