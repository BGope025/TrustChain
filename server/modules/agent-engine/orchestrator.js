const planner = require('./planner');
const toolRouter = require('./tool-router');
const validator = require('./validator');
const synthesizer = require('./synthesizer');
const analyticsService = require('../../services/analytics.service');

/**
 * TrustChain: Agent Orchestrator
 * The main lifecycle loop that drives every AI agent task from start to finish.
 *
 * Lifecycle:  PLAN → ROUTE → EXECUTE → VALIDATE → SYNTHESIZE → RESPOND
 *
 * Each phase is handled by its own sub-module inside agent-engine/.
 * The orchestrator simply coordinates handoffs between them.
 */

// LIFECYCLE STATES
const STATES = Object.freeze({
    IDLE:         'idle',
    PLANNING:     'planning',
    ROUTING:      'routing',
    EXECUTING:    'executing',
    VALIDATING:   'validating',
    SYNTHESIZING: 'synthesizing',
    COMPLETED:    'completed',
    ERROR:        'error'
});

// ACTIVE RUNS (in-memory)
const activeRuns = new Map();   // runId → run context
const runHistory = [];          // completed runs (newest first)

// MAIN ENTRY POINT

/**
 * Executes the full agent lifecycle for a given task.
 *
 * @param   {Object}  options
 * @param   {string}  options.task      - Natural-language task description
 * @param   {string}  options.agentId   - Authenticated agent ID
 * @param   {Object}  [options.context] - Optional prior-context or constraints
 * @returns {Object}  Full execution result
 */
async function executeTask({ task, agentId, context = {} }) {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    const run = {
        runId,
        agentId,
        task,
        state: STATES.IDLE,
        phases: [],
        startedAt: new Date().toISOString(),
        completedAt: null,
        error: null
    };

    activeRuns.set(runId, run);

    try {
        // ── Phase 1: PLAN 
        _transition(run, STATES.PLANNING);
        console.log(`\n🧠 [Orchestrator] Phase 1/5 — PLANNING task: "${task}"`);

        const plan = await planner.deconstructTask(task, context);
        run.phases.push({ name: 'plan', durationMs: Date.now() - startTime, subtasks: plan.subtasks.length });

        // ── Phase 2: ROUTE 
        _transition(run, STATES.ROUTING);
        console.log(`🔀 [Orchestrator] Phase 2/5 — ROUTING ${plan.subtasks.length} subtasks to services`);

        const routingResult = await toolRouter.routeSubtasks(plan.subtasks);
        run.phases.push({ name: 'route', durationMs: Date.now() - startTime, matched: routingResult.matched });

        // ── Phase 3: EXECUTE 
        _transition(run, STATES.EXECUTING);
        console.log(`⚡ [Orchestrator] Phase 3/5 — EXECUTING ${routingResult.assignments.length} service calls`);

        const executionResults = [];
        for (const assignment of routingResult.assignments) {
            const execStart = Date.now();

            // Simulate service call with realistic delay
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

            const result = {
                subtask: assignment.subtask,
                serviceId: assignment.serviceId,
                serviceName: assignment.serviceName,
                provider: assignment.provider,
                cost: assignment.cost,
                latencyMs: Date.now() - execStart,
                payload: _generateMockPayload(assignment.serviceName),
                timestamp: new Date().toISOString()
            };

            executionResults.push(result);

            // Record analytics
            analyticsService.recordEvent({
                serviceId: assignment.serviceId,
                serviceName: assignment.serviceName,
                provider: assignment.provider,
                cost: assignment.cost,
                latencyMs: result.latencyMs,
                txHash: `TX_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
                success: true
            });
        }

        run.phases.push({ name: 'execute', durationMs: Date.now() - startTime, calls: executionResults.length });

        // ── Phase 4: VALIDATE 
        _transition(run, STATES.VALIDATING);
        console.log(`✔️  [Orchestrator] Phase 4/5 — VALIDATING ${executionResults.length} payloads`);

        const validatedResults = validator.validateBatch(executionResults);
        run.phases.push({ name: 'validate', durationMs: Date.now() - startTime, valid: validatedResults.validCount });

        // ── Phase 5: SYNTHESIZE 
        _transition(run, STATES.SYNTHESIZING);
        console.log(`🎯 [Orchestrator] Phase 5/5 — SYNTHESIZING final response`);

        const synthesis = synthesizer.synthesize({
            task,
            results: validatedResults.results,
            plan
        });

        run.phases.push({ name: 'synthesize', durationMs: Date.now() - startTime });

        // ── DONE 
        _transition(run, STATES.COMPLETED);
        run.completedAt = new Date().toISOString();

        const totalDuration = Date.now() - startTime;
        const totalCost = executionResults.reduce((s, r) => s + r.cost, 0);

        console.log(`\n✅ [Orchestrator] Run ${runId} complete — ${totalDuration}ms, $${totalCost.toFixed(4)} USDC`);

        // Archive
        activeRuns.delete(runId);
        runHistory.unshift({ ...run, totalDuration, totalCost });
        if (runHistory.length > 100) runHistory.length = 100;

        return {
            runId,
            task,
            agentId,
            metrics: {
                totalDuration,
                totalCost: Number(totalCost.toFixed(4)),
                servicesUsed: executionResults.length,
                phases: run.phases
            },
            transactions: executionResults.map(r => ({
                service: r.serviceName,
                provider: r.provider,
                amount: r.cost,
                latencyMs: r.latencyMs,
                status: '✓ Confirmed',
                timestamp: r.timestamp
            })),
            result: synthesis.recommendation,
            confidence: synthesis.confidence,
            dataSources: synthesis.dataSources
        };

    } catch (error) {
        _transition(run, STATES.ERROR);
        run.error = error.message;
        run.completedAt = new Date().toISOString();
        activeRuns.delete(runId);
        runHistory.unshift(run);

        console.error(`🚨 [Orchestrator] Run ${runId} failed:`, error.message);
        throw error;
    }
}

// STATUS & HISTORY

/** Returns all currently executing runs. */
function getActiveRuns() {
    return Array.from(activeRuns.values());
}

/** Returns historical run summaries. */
function getRunHistory(limit = 20) {
    return runHistory.slice(0, limit);
}

/** Returns a specific run by ID (active or archived). */
function getRunById(runId) {
    return activeRuns.get(runId) || runHistory.find(r => r.runId === runId) || null;
}

// INTERNAL HELPERS

function _transition(run, newState) {
    run.state = newState;
}

function _generateMockPayload(serviceName) {
    const payloads = {
        'MarketData Pro': { asset: 'ALGO', price: 0.185, trend: 'Bullish', volume24h: '45.2M' },
        'NewsPulse API':  { sentiment: 'Positive', score: 0.81, articles: 142 },
        'RiskAI Engine':  { riskLevel: 'Low to Moderate', riskScore: 62, confidence: 94.5 }
    };
    return payloads[serviceName] || { status: 'ok', data: 'Mock response payload' };
}

// EXPORTS
module.exports = {
    executeTask,
    getActiveRuns,
    getRunHistory,
    getRunById,
    STATES
};
