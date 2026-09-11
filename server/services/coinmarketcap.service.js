/**
 * ASB-Pay Service: CoinMarketCap API
 * Provider: CoinMarketCap
 * Price: $0.0002 per call (marketplace unit price)
 */

const fetchCoinmarketcap = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from CoinMarketCap API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://coinmarketcap.com/api/pricing/');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from coinmarketcap:`, error.message);
        return null;
    }
};

module.exports = { fetchCoinmarketcap };
