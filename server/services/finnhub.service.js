/**
 * ASB-Pay Service: Finnhub Stock API
 * Provider: Finnhub
 * Price: $0.0001 per call (marketplace unit price)
 */

const fetchFinnhub = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from Finnhub Stock API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://finnhub.io/');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from finnhub:`, error.message);
        return null;
    }
};

module.exports = { fetchFinnhub };
