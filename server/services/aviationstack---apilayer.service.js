/**
 * ASB-Pay Service: Aviationstack Flight Data API
 * Provider: Aviationstack / APILayer
 * Price: $0.001 per call (marketplace unit price)
 */

const fetchAviationstackApilayer = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from Aviationstack Flight Data API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://aviationstack.com/');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from aviationstack---apilayer:`, error.message);
        return null;
    }
};

module.exports = { fetchAviationstackApilayer };
