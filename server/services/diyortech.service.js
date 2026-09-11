/**
 * ASB-Pay Service: Instagram Post, Reels & Stories Downloader API
 * Provider: diyortech
 * Price: $0.0005 per call (marketplace unit price)
 */

const fetchDiyortech = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from Instagram Post, Reels & Stories Downloader API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://api.market/store/diyortech/instagram');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from diyortech:`, error.message);
        return null;
    }
};

module.exports = { fetchDiyortech };
