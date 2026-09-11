const agentService = require('../services/agent.service');

/**
 * TrustChain: Agent Controller
 * Handles HTTP request/response for AI agent orchestration endpoints.
 * Delegates all business logic to agent.service.js.
 */

// 1. RUN AGENT TASK
// Handler for: POST /api/agent/run
async function runTask(req, res, next) {
    const { task } = req.body;
    const agentId = req.agentSession.agentId;

    console.log(`\n=========================================`);
    console.log(`🤖 [AI Agent] ACTIVATED`);
    console.log(`📋 [Task] "${task}"`);
    console.log(`=========================================\n`);

    try {
        const result = await agentService.runFullCycle(task, agentId);

        return res.json(result);

    } catch (error) {
        console.error(`🚨 [Agent Controller] Error during task execution:`, error.message);
        next(error);
    }
}

// 2. GET AGENT STATUS
// Handler for: GET /api/agent/status
function getStatus(req, res) {
    const agentId = req.agentSession.agentId;
    const status = agentService.getAgentStatus(agentId);

    res.json({
        success: true,
        agent: status
    });
}

// 3. GET AGENT TASK HISTORY
// Handler for: GET /api/agent/history
function getHistory(req, res) {
    const limit = parseInt(req.query.limit, 10) || 10;
    const history = agentService.getHistory(limit);

    res.json({
        success: true,
        count: history.length,
        history
    });
}

// EXPORTS
module.exports = {
    runTask,
    getStatus,
    getHistory
};
