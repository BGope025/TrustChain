/**
 * TrustChain: Task Planner
 * Deconstructs a natural-language prompt into discrete, actionable subtasks
 * that can be routed to marketplace services.
 *
 * In production this would call OpenAI / Gemini for intent decomposition.
 * For the hackathon MVP we use keyword-matching heuristics.
 */

// KEYWORD → SUBTASK MAPPINGS
const TASK_PATTERNS = [
    {
        keywords: ['market', 'price', 'stock', 'crypto', 'trading', 'financial', 'investment', 'fund'],
        subtask: {
            type: 'data_retrieval',
            category: 'Finance',
            label: 'Fetch market data & financial indicators',
            requiredCapability: 'market_data',
            priority: 1
        }
    },
    {
        keywords: ['news', 'sentiment', 'article', 'headline', 'media', 'press', 'report'],
        subtask: {
            type: 'data_retrieval',
            category: 'Media',
            label: 'Analyze news sentiment & media coverage',
            requiredCapability: 'news_sentiment',
            priority: 2
        }
    },
    {
        keywords: ['risk', 'analysis', 'threat', 'danger', 'safety', 'compliance', 'audit'],
        subtask: {
            type: 'analysis',
            category: 'Analytics',
            label: 'Run risk & compliance analysis',
            requiredCapability: 'risk_analysis',
            priority: 3
        }
    },
    {
        keywords: ['image', 'vision', 'ocr', 'scan', 'document', 'photo', 'picture'],
        subtask: {
            type: 'processing',
            category: 'AI',
            label: 'Process visual data via OCR/Vision AI',
            requiredCapability: 'vision_processing',
            priority: 4
        }
    },
    {
        keywords: ['translate', 'language', 'text', 'nlp', 'summary', 'summarize'],
        subtask: {
            type: 'processing',
            category: 'AI',
            label: 'Natural language processing & summarization',
            requiredCapability: 'nlp',
            priority: 5
        }
    }
];

// ALWAYS-INCLUDE SUBTASK
// Every task gets a final synthesis step regardless of keywords
const SYNTHESIS_SUBTASK = {
    type: 'synthesis',
    category: 'Internal',
    label: 'Compile and synthesize gathered data into recommendation',
    requiredCapability: 'synthesis',
    priority: 99,
    internal: true  // Not routed to an external service
};

// MAIN FUNCTION
/**
 * Deconstructs a natural-language task into ordered subtasks.
 *
 * @param   {string}  taskDescription - Raw task from the user
 * @param   {Object}  [context={}]    - Optional prior context / constraints
 * @returns {Object}  plan — { taskDescription, subtasks[], strategy, estimatedSteps }
 */
async function deconstructTask(taskDescription, context = {}) {
    const normalised = taskDescription.toLowerCase();
    const matchedSubtasks = [];

    // ── Keyword matching 
    for (const pattern of TASK_PATTERNS) {
        const matched = pattern.keywords.some(kw => normalised.includes(kw));
        if (matched) {
            matchedSubtasks.push({
                ...pattern.subtask,
                id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                source: 'keyword_match',
                matchedKeywords: pattern.keywords.filter(kw => normalised.includes(kw))
            });
        }
    }

    // ── Fallback: if nothing matched, create a generic data retrieval subtask
    if (matchedSubtasks.length === 0) {
        matchedSubtasks.push({
            id: `st_${Date.now()}_fallback`,
            type: 'data_retrieval',
            category: 'General',
            label: 'General data retrieval for unclassified task',
            requiredCapability: 'general',
            priority: 1,
            source: 'fallback'
        });
    }

    // ── Always append synthesis 
    matchedSubtasks.push({
        ...SYNTHESIS_SUBTASK,
        id: `st_${Date.now()}_synth`
    });

    // Sort by priority
    matchedSubtasks.sort((a, b) => a.priority - b.priority);

    // ── Determine strategy 
    const externalSteps = matchedSubtasks.filter(s => !s.internal);
    const strategy = externalSteps.length > 2 ? 'parallel_fan_out' : 'sequential';

    console.log(
        `📝 [Planner] Decomposed task into ${matchedSubtasks.length} subtasks ` +
        `(${externalSteps.length} external, strategy: ${strategy})`
    );

    return {
        taskDescription,
        subtasks: matchedSubtasks,
        strategy,
        estimatedSteps: externalSteps.length,
        context,
        plannedAt: new Date().toISOString()
    };
}

/**
 * Returns the list of known task patterns (for debugging / admin UI).
 */
function getTaskPatterns() {
    return TASK_PATTERNS.map(p => ({
        keywords: p.keywords,
        category: p.subtask.category,
        label: p.subtask.label
    }));
}

// EXPORTS
module.exports = {
    deconstructTask,
    getTaskPatterns
};
