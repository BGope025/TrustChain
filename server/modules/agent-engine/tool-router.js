const serviceSelector = require('./service-selector');

/**
 * TrustChain: Tool Router
 * Takes the subtask list produced by the planner and maps each subtask
 * to the best marketplace service based on category, trust, and cost.
 *
 * Subtasks marked as `internal: true` (e.g. synthesis) are skipped —
 * they run locally inside the agent engine.
 */

// CATEGORY → SERVICE CAPABILITY MAP
const CAPABILITY_MAP = {
    'Finance':   ['market_data', 'financial_indicators', 'trading_signals'],
    'Media':     ['news_sentiment', 'press_monitoring', 'social_listening'],
    'Analytics': ['risk_analysis', 'compliance_check', 'anomaly_detection'],
    'AI':        ['vision_processing', 'nlp', 'generative_ai'],
    'General':   ['general']
};

// MAIN FUNCTION

/**
 * Routes each subtask to the best-matching marketplace service.
 *
 * @param   {Array}  subtasks - Array of subtask objects from the planner
 * @returns {Object} routingResult — { assignments[], skipped[], matched, unmatched }
 */
async function routeSubtasks(subtasks) {
    const assignments = [];
    const skipped = [];
    let matched = 0;
    let unmatched = 0;

    for (const subtask of subtasks) {
        // Skip internal subtasks (synthesis, etc.)
        if (subtask.internal) {
            skipped.push({ subtaskId: subtask.id, label: subtask.label, reason: 'internal' });
            continue;
        }

        // Find the best service for this subtask's category
        const selectedService = serviceSelector.selectBestService({
            category: subtask.category,
            requiredCapability: subtask.requiredCapability
        });

        if (selectedService) {
            assignments.push({
                subtaskId: subtask.id,
                subtask: subtask.label,
                type: subtask.type,
                category: subtask.category,
                serviceId: selectedService.id,
                serviceName: selectedService.name,
                provider: selectedService.provider,
                cost: selectedService.cost,
                trustScore: selectedService.trustScore,
                latencyMs: selectedService.latencyMs,
                routedAt: new Date().toISOString()
            });
            matched++;

            console.log(
                `🔀 [Tool Router] "${subtask.label}" → ${selectedService.name} ` +
                `($${selectedService.cost}, trust: ${selectedService.trustScore})`
            );
        } else {
            // No service available for this category
            skipped.push({
                subtaskId: subtask.id,
                label: subtask.label,
                reason: 'no_matching_service'
            });
            unmatched++;

            console.log(`⚠️  [Tool Router] No service found for subtask: "${subtask.label}"`);
        }
    }

    console.log(
        `\n📊 [Tool Router] Routing complete — ` +
        `${matched} matched, ${unmatched} unmatched, ${skipped.length} skipped`
    );

    return {
        assignments,
        skipped,
        matched,
        unmatched,
        totalSubtasks: subtasks.length,
        routedAt: new Date().toISOString()
    };
}

/**
 * Checks if a given capability string maps to a known category.
 *
 * @param   {string} capability
 * @returns {string|null} The category name, or null
 */
function resolveCategory(capability) {
    for (const [category, capabilities] of Object.entries(CAPABILITY_MAP)) {
        if (capabilities.includes(capability)) return category;
    }
    return null;
}

/**
 * Returns the full capability map (for admin/debug UI).
 */
function getCapabilityMap() {
    return { ...CAPABILITY_MAP };
}

// EXPORTS
module.exports = {
    routeSubtasks,
    resolveCategory,
    getCapabilityMap
};
