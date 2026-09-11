/**
 * ASB-Pay Service: Twelve Data API
 * Provider: Twelve Data
 * Price: $0.0001 per call (marketplace unit price)
 */

const fetchTwelveData = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from Twelve Data API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://twelvedata.com/');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from twelve-data:`, error.message);
        return null;
    }
};

module.exports = { fetchTwelveData };
