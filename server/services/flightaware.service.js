/**
 * ASB-Pay Service: AeroAPI
 * Provider: FlightAware
 * Price: $0.002 per call (marketplace unit price)
 */

const fetchFlightaware = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from AeroAPI...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://www.flightaware.com/commercial/data/');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from flightaware:`, error.message);
        return null;
    }
};

module.exports = { fetchFlightaware };
