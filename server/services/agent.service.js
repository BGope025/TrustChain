const { POLICIES } = require('../config/constants');
const algorandConfig = require('../config/algorand');
const marketplaceService = require('./marketplace.service');
const walletService = require('./wallet.service');
const paymentService = require('./payment.service');

/**
 * ASB-Pay: Agent Orchestration Service
 * Coordinates the full lifecycle of an AI agent task:
 *   1. Planning  — selects the cheapest, most trusted services from the marketplace
 *   2. Execution — iterates through the plan, settling x402 payments per step
 *   3. Synthesis — compiles the gathered data into a final recommendation
 */

// ------------------------------------------
// IN-MEMORY SESSION STATE
// ------------------------------------------
const agentState = {
    status: 'idle',          // idle | planning | executing | synthesizing | error
    currentTaskId: null,
    completedTasks: 0,
    totalSpent: 0,
    history: []              // Last N execution summaries
};

// ------------------------------------------
// 1. PLAN A TASK
// ------------------------------------------
/**
 * Generates an execution plan by querying the marketplace for trusted,
 * budget-compliant services that match the task requirements.
 *
 * @param   {string} taskDescription - Natural-language task from the user / AI
 * @returns {Object} plan — { taskId, steps[], estimatedCost }
 */
async function planTask(taskDescription) {
    agentState.status = 'planning';

    console.log(`\n🧠 [Agent Service] Planning task: "${taskDescription}"`);

    // Fetch all active, trusted services from the marketplace
    const availableServices = marketplaceService.discoverServices({
        minTrustScore: POLICIES.MIN_TRUST_SCORE
    });

    // Filter to services within the per-transaction spend limit
    const affordableServices = availableServices.filter(
        svc => svc.cost <= POLICIES.MAX_PER_TX_SPEND
    );

    // Build the execution plan
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const steps = affordableServices.map((svc, index) => ({
        stepNumber: index + 1,
        serviceId: svc.id,
        serviceName: svc.name,
        provider: svc.provider,
        cost: svc.cost,
        trustScore: svc.trustScore,
        status: 'pending'
    }));

    const estimatedCost = steps.reduce((sum, s) => sum + s.cost, 0);

    console.log(`📋 [Agent Service] Plan ready — ${steps.length} steps, est. cost: $${estimatedCost.toFixed(4)} USDC`);

    return { taskId, steps, estimatedCost };
}

// ------------------------------------------
// 2. EXECUTE A PLAN (the core loop)
// ------------------------------------------
/**
 * Iterates through every step in the plan, settling an x402 payment for each
 * service and collecting the returned data.
 *
 * @param   {Object}  plan  - Output of planTask()
 * @param   {string}  agentId - The authenticated agent's ID
 * @returns {Object}  executionResult — { transactions[], totalSpent, success }
 */
async function executePlan(plan, agentId) {
    agentState.status = 'executing';
    agentState.currentTaskId = plan.taskId;

    const transactions = [];
    let totalSpent = 0;

    console.log(`\n🚀 [Agent Service] Executing plan ${plan.taskId} (${plan.steps.length} steps)`);

    for (const step of plan.steps) {
        try {
            // --- Budget guard-rail ---
            const wallet = walletService.getWalletState();
            const remainingBudget = wallet.dailyLimit - wallet.spentToday;

            if (step.cost > remainingBudget) {
                console.log(`🛑 [Agent Service] Budget exhausted — skipping ${step.serviceName}`);
                step.status = 'skipped_budget';
                transactions.push({
                    service: step.serviceName,
                    provider: step.provider,
                    amount: step.cost,
                    txHash: null,
                    status: '✗ Skipped (budget)',
                    timestamp: new Date().toISOString()
                });
                continue;
            }

            // --- Execute x402 payment ---
            console.log(`\n⏳ [Agent Service] Step ${step.stepNumber}: Paying ${step.serviceName}...`);
            const receipt = await paymentService.settlePayment({
                serviceId: step.serviceId,
                amount: step.cost,
                provider: step.provider
            });

            // --- Debit the wallet ---
            walletService.recordSpend(step.cost);

            step.status = 'confirmed';
            totalSpent += step.cost;

            transactions.push({
                service: step.serviceName,
                provider: step.provider,
                amount: step.cost,
                txHash: receipt.txHash,
                receiptToken: receipt.receiptToken,
                status: '✓ Confirmed',
                explorerUrl: algorandConfig.EXPLORER.getTxUrl(receipt.txHash),
                timestamp: receipt.settledAt
            });

            console.log(`✅ [Agent Service] ${step.serviceName} settled — ${receipt.txHash}`);

        } catch (err) {
            console.error(`🚨 [Agent Service] Step ${step.stepNumber} failed:`, err.message);
            step.status = 'error';
            transactions.push({
                service: step.serviceName,
                provider: step.provider,
                amount: step.cost,
                txHash: null,
                status: `✗ Error: ${err.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Update cumulative state
    agentState.totalSpent += totalSpent;
    agentState.completedTasks += 1;

    return { transactions, totalSpent, success: true };
}

// ------------------------------------------
// 3. SYNTHESIZE FINAL RESULT
// ------------------------------------------
/**
 * Compiles all gathered data into a human-readable recommendation.
 * In production this would call OpenAI; for the MVP we return a rich mock.
 *
 * @param   {string}  task          - Original task description
 * @param   {Object}  executionResult - Output of executePlan()
 * @returns {Object}  synthesis — { summary, confidence, recommendation }
 */
function synthesizeResult(task, executionResult) {
    agentState.status = 'synthesizing';

    const confirmedSteps = executionResult.transactions.filter(t => t.status.includes('Confirmed'));

    const synthesis = {
        summary: `Analyzed ${confirmedSteps.length} data sources for: "${task}". ` +
                 `Total cost: $${executionResult.totalSpent.toFixed(4)} USDC on Algorand Testnet.`,
        confidence: 94.5,
        recommendation: 'Based on the gathered data: Company X has strong fundamentals (PE: 24.2), ' +
                        'positive news sentiment (Score: 0.81), and an acceptable risk score of 62. ' +
                        'Recommendation: Proceed with investment.',
        dataSources: confirmedSteps.map(t => t.service)
    };

    console.log(`\n🎯 [Agent Service] Synthesis complete — confidence: ${synthesis.confidence}%`);

    // Archive into history
    agentState.history.unshift({
        taskId: agentState.currentTaskId,
        task,
        synthesis,
        totalSpent: executionResult.totalSpent,
        completedAt: new Date().toISOString()
    });

    // Keep only the last 50 entries
    if (agentState.history.length > 50) agentState.history.length = 50;

    agentState.status = 'idle';
    agentState.currentTaskId = null;

    return synthesis;
}

// ------------------------------------------
// 4. FULL RUN (convenience wrapper)
// ------------------------------------------
/**
 * One-call orchestration: plan → execute → synthesize.
 *
 * @param   {string} task     - Natural-language task
 * @param   {string} agentId  - Authenticated agent ID
 * @returns {Object} Full response payload for the route handler
 */
async function runFullCycle(task, agentId) {
    const plan = await planTask(task);
    const executionResult = await executePlan(plan, agentId);
    const synthesis = synthesizeResult(task, executionResult);

    return {
        success: true,
        task,
        agentId,
        metrics: {
            servicesUsed: executionResult.transactions.length,
            totalCost: executionResult.totalSpent.toFixed(4)
        },
        transactions: executionResult.transactions,
        result: synthesis.recommendation
    };
}

// ------------------------------------------
// 5. STATUS HELPERS
// ------------------------------------------
/**
 * Returns the current agent runtime state.
 */
function getAgentStatus(agentId) {
    return {
        id: agentId,
        status: agentState.status === 'idle' ? 'Idle - Ready for tasks' : agentState.status,
        completedTasks: agentState.completedTasks,
        totalSpent: Number(agentState.totalSpent.toFixed(4)),
        trustScore: 96.8,
        uptime: '99.9%'
    };
}

/**
 * Returns the last N task execution summaries.
 */
function getHistory(limit = 10) {
    return agentState.history.slice(0, limit);
}

// ------------------------------------------
// EXPORTS
// ------------------------------------------
module.exports = {
    planTask,
    executePlan,
    synthesizeResult,
    runFullCycle,
    getAgentStatus,
    getHistory
};
