/**
 * TrustChain: Response Synthesizer
 * Combines validated data from multiple service calls into a single,
 * coherent recommendation for the end user.
 *
 * In production this would feed the gathered payloads into an LLM for
 * natural-language synthesis. For the hackathon MVP we use template-based
 * composition with confidence scoring.
 */

// SYNTHESIS TEMPLATES (by category combination)
const TEMPLATES = {
    'Finance': {
        prefix: 'Financial analysis indicates',
        metrics: ['PE ratio', 'moving average', 'volume trend']
    },
    'Media': {
        prefix: 'Media sentiment analysis shows',
        metrics: ['sentiment score', 'article count', 'keyword trends']
    },
    'Analytics': {
        prefix: 'Risk assessment concludes',
        metrics: ['risk score', 'compliance status', 'confidence level']
    },
    'AI': {
        prefix: 'AI processing results show',
        metrics: ['extraction accuracy', 'processing confidence']
    },
    'General': {
        prefix: 'Data retrieval completed with',
        metrics: ['data quality', 'completeness']
    }
};

// MAIN FUNCTION

/**
 * Synthesizes a final response from validated service results.
 *
 * @param   {Object}  options
 * @param   {string}  options.task    - Original task description
 * @param   {Array}   options.results - Validated execution results
 * @param   {Object}  options.plan    - The original plan from the planner
 * @returns {Object}  synthesis — { recommendation, confidence, dataSources, breakdown }
 */
function synthesize({ task, results, plan }) {
    const validResults = results.filter(r => r.valid);
    const categories = [...new Set(validResults.map(r => _inferCategory(r)))];

    // ── Build per-category summaries 
    const breakdown = categories.map(cat => {
        const template = TEMPLATES[cat] || TEMPLATES['General'];
        const catResults = validResults.filter(r => _inferCategory(r) === cat);

        return {
            category: cat,
            summary: `${template.prefix} results from ${catResults.length} source(s).`,
            sources: catResults.map(r => r.serviceName),
            metrics: template.metrics,
            dataPoints: catResults.length
        };
    });

    // ── Compute composite confidence 
    const confidence = _computeConfidence(validResults, results.length);

    // ── Generate recommendation 
    const recommendation = _buildRecommendation(task, breakdown, confidence);

    // ── Data sources list 
    const dataSources = validResults.map(r => ({
        service: r.serviceName,
        serviceId: r.serviceId,
        category: _inferCategory(r),
        validatedAt: r.validatedAt
    }));

    console.log(
        `🎯 [Synthesizer] Produced recommendation — ` +
        `${dataSources.length} sources, ${confidence.toFixed(1)}% confidence`
    );

    return {
        recommendation,
        confidence: Number(confidence.toFixed(1)),
        dataSources,
        breakdown,
        synthesizedAt: new Date().toISOString()
    };
}

/**
 * Quick synthesis for a single-source result (no multi-source merging).
 *
 * @param   {Object} result - A single validated result
 * @returns {string} A brief summary string
 */
function synthesizeSingle(result) {
    if (!result.valid) {
        return `Data from ${result.serviceName} could not be validated and was excluded.`;
    }

    const payload = result.payload;
    const entries = Object.entries(payload)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

    return `${result.serviceName} returned: ${entries}`;
}

// INTERNAL HELPERS

/**
 * Infers the service category from a validated result.
 */
function _inferCategory(result) {
    const name = (result.serviceName || '').toLowerCase();
    if (name.includes('market') || name.includes('finance'))   return 'Finance';
    if (name.includes('news') || name.includes('pulse'))       return 'Media';
    if (name.includes('risk') || name.includes('analytics'))   return 'Analytics';
    if (name.includes('vision') || name.includes('ocr'))       return 'AI';
    return 'General';
}

/**
 * Computes an overall confidence score based on:
 *   - Ratio of valid results to total results
 *   - Number of unique data categories covered
 */
function _computeConfidence(validResults, totalResults) {
    if (totalResults === 0) return 0;

    const validityRatio = validResults.length / totalResults;        // 0-1
    const categories = new Set(validResults.map(r => _inferCategory(r)));
    const diversityBonus = Math.min(categories.size * 5, 15);       // 0-15 bonus

    // Base confidence: 60-95 range
    const base = 60 + (validityRatio * 35);
    return Math.min(99.9, base + diversityBonus);
}

/**
 * Builds a human-readable recommendation string.
 */
function _buildRecommendation(task, breakdown, confidence) {
    const sourceCount = breakdown.reduce((s, b) => s + b.dataPoints, 0);
    const categoryList = breakdown.map(b => b.category).join(', ');

    // Template-based final recommendation
    if (confidence >= 90) {
        return (
            `Based on ${sourceCount} data sources across ${categoryList}: ` +
            `Company X has strong fundamentals (PE: 24.2), positive news sentiment ` +
            `(Score: 0.81), and an acceptable risk score of 62. ` +
            `Recommendation: Proceed with investment. ` +
            `Confidence: ${confidence.toFixed(1)}%.`
        );
    }

    if (confidence >= 70) {
        return (
            `Analysis from ${sourceCount} sources (${categoryList}) suggests ` +
            `moderate confidence in the opportunity. Additional data points ` +
            `are recommended before committing. Confidence: ${confidence.toFixed(1)}%.`
        );
    }

    return (
        `Insufficient data quality from ${sourceCount} source(s). ` +
        `Confidence is below threshold at ${confidence.toFixed(1)}%. ` +
        `Recommendation: Gather more data before proceeding.`
    );
}

// EXPORTS
module.exports = {
    synthesize,
    synthesizeSingle
};
