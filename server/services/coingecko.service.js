/**
 * ASB-Pay Service: CoinGecko API
 * Provider: CoinGecko
 * Price: $0.0001 per call (marketplace unit price)
 */

const fetchCoingecko = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from CoinGecko API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://www.coingecko.com/en/api');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from coingecko:`, error.message);
        return null;
    }
};

module.exports = { fetchCoingecko };
