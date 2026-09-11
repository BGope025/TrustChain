/**
 * ASB-Pay Service: OCR API
 * Provider: OCR.Space
 * Price: $0.0001 per call (marketplace unit price)
 */

const fetchOcrSpace = async () => {
    try {
        console.log(`🤖 [Service] Fetching data from OCR API...`);
        
        // Note: You may need to adjust endpoint paths, headers, or API keys for production
        const response = await fetch('https://ocr.space/ocrapi');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`🚨 [Service Error] Failed to fetch from ocr-space:`, error.message);
        return null;
    }
};

module.exports = { fetchOcrSpace };
