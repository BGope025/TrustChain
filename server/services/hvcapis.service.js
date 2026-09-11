/**
 * ASB-Pay Service: Government Revenue Dependency Score API
 * Provider: hvcapis
 * Price: $0.0005 per call (marketplace unit price)
 */

const fetchHvcapis = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from Government Revenue Dependency Score API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://api.market/store/hvcapis/grds');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from hvcapis:`, error.message);
        return null;
    }
};

module.exports = { fetchHvcapis };
