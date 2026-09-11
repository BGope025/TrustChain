/**
 * TrustChain: validation middleware
 * ensures incoming requests have the correct data payloads before they are processed by the core AI or Payment engines.
 */

// 1. validates the AI agent "Run" request
const validateAgentRun = (req, res, next) => {
    const { task } = req.body;

    // check if task is missing, not a string, or just empty spaces
    if (!task || typeof task !== 'string' || task.trim() === '') {
        console.log(`⚠️ [Validation] Blocked invalid agent run request. Task was empty.`);
        return res.status(400).json({
            success: false,
            error: "Invalid Request: Please provide a valid task description for the AI Agent."
        });
    }

    // clean up the string (removes extra spaces from the beginning and end)
    req.body.task = task.trim();

    // everything looks good, pass it to the next step
    next();
};

// 2. validates any direct x402 payment requests
const validatePaymentRequest = (req, res, next) => {
    const { amount, serviceId } = req.body;

    // check if amount is missing or not a valid positive number
    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
        console.log(`⚠️ [Validation] Blocked invalid payment amount: ${amount}`);
        return res.status(400).json({
            success: false,
            error: "Invalid Request: Payment amount must be a positive number."
        });
    }

    // check if the service id was provided
    if (!serviceId || typeof serviceId !== 'string') {
        console.log(`⚠️ [Validation] Blocked payment. Missing Service ID.`);
        return res.status(400).json({
            success: false,
            error: "Invalid Request: A valid Service ID is required for x402 settlement."
        });
    }

    // data is valid, proceed to the payment engine
    next();
};

module.exports = {
    validateAgentRun,
    validatePaymentRequest
};