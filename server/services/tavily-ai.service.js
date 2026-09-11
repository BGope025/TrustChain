/**
 * ASB-Pay Service: Tavily API
 * Provider: tavily-ai
 * Price: $0.001 per call (marketplace unit price)
 */

const fetchTavilyAi = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from Tavily API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://api.market/store/tavily-ai/tavily');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from tavily-ai:`, error.message);
        return null;
    }
};

module.exports = { fetchTavilyAi };
