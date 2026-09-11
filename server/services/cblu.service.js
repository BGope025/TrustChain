/**
 * ASB-Pay Service: USAspending Federal Awards Search API
 * Provider: cblu
 * Price: $0.005 per call (marketplace unit price)
 */

const fetchCblu = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from USAspending Federal Awards Search API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://api.market/store/cblu/usaspending-federal-awards');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from cblu:`, error.message);
        return null;
    }
};

module.exports = { fetchCblu };
