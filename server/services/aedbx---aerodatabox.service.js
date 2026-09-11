/**
 * ASB-Pay Service: AeroDataBox API - Aviation and Flight API
 * Provider: aedbx / AeroDataBox
 * Price: $0.001 per call (marketplace unit price)
 */

const fetchAedbxAerodatabox = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from AeroDataBox API - Aviation and Flight API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://api.market/store/aedbx/aerodatabox');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from aedbx---aerodatabox:`, error.message);
        return null;
    }
};

module.exports = { fetchAedbxAerodatabox };
