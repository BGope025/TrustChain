/**
 * ASB-Pay: Payload Validator
 * Validates the data payloads returned by marketplace services to ensure
 * they are well-formed, non-empty, and haven't been tampered with.
 *
 * Each validation rule produces a severity level:
 *   - ERROR:   payload is rejected, subtask marked as failed
 *   - WARNING: payload is accepted but flagged for review
 *   - PASS:    payload is clean
 */

// VALIDATION RULES
const RULES = [
    {
        id: 'non_null',
        description: 'Payload must not be null or undefined',
        severity: 'error',
        check: (payload) => payload != null
    },
    {
        id: 'non_empty',
        description: 'Payload must not be an empty object',
        severity: 'error',
        check: (payload) => {
            if (typeof payload !== 'object') return true;
            return Object.keys(payload).length > 0;
        }
    },
    {
        id: 'no_error_field',
        description: 'Payload should not contain an error field',
        severity: 'error',
        check: (payload) => {
            if (typeof payload !== 'object') return true;
            return !payload.error && !payload.Error;
        }
    },
    {
        id: 'reasonable_size',
        description: 'Payload JSON size should be under 1 MB',
        severity: 'warning',
        check: (payload) => {
            const size = JSON.stringify(payload).length;
            return size < 1_000_000;
        }
    },
    {
        id: 'no_html_injection',
        description: 'Payload values should not contain raw HTML/script tags',
        severity: 'warning',
        check: (payload) => {
            const json = JSON.stringify(payload);
            return !/<script/i.test(json) && !/<iframe/i.test(json);
        }
    },
    {
        id: 'timestamp_present',
        description: 'Result should have a timestamp for audit trail',
        severity: 'warning',
        check: (_payload, executionResult) => !!executionResult.timestamp
    }
];

// SINGLE VALIDATION

/**
 * Validates a single execution result's payload against all rules.
 *
 * @param   {Object} executionResult - Full result object from the orchestrator
 * @returns {Object} { valid, payload, violations[], serviceName }
 */
function validatePayload(executionResult) {
    const { payload, serviceName } = executionResult;
    const violations = [];
    let hasError = false;

    for (const rule of RULES) {
        const passed = rule.check(payload, executionResult);

        if (!passed) {
            violations.push({
                ruleId: rule.id,
                description: rule.description,
                severity: rule.severity
            });

            if (rule.severity === 'error') {
                hasError = true;
            }
        }
    }

    const valid = !hasError;

    if (violations.length > 0) {
        console.log(
            `⚠️  [Validator] ${serviceName}: ${violations.length} violation(s) — ` +
            `${valid ? 'ACCEPTED with warnings' : 'REJECTED'}`
        );
    }

    return {
        valid,
        serviceName,
        serviceId: executionResult.serviceId,
        payload: valid ? payload : null,
        violations,
        validatedAt: new Date().toISOString()
    };
}

// BATCH VALIDATION

/**
 * Validates an array of execution results.
 *
 * @param   {Array}  executionResults - Array of execution result objects
 * @returns {Object} { results[], validCount, invalidCount, warningCount }
 */
function validateBatch(executionResults) {
    const results = executionResults.map(er => validatePayload(er));

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;
    const warningCount = results.reduce(
        (sum, r) => sum + r.violations.filter(v => v.severity === 'warning').length,
        0
    );

    console.log(
        `\n✔️  [Validator] Batch complete — ` +
        `${validCount} valid, ${invalidCount} rejected, ${warningCount} warnings`
    );

    return {
        results,
        validCount,
        invalidCount,
        warningCount,
        totalValidated: results.length
    };
}

/**
 * Returns the list of active validation rules (for admin/debug UI).
 */
function getValidationRules() {
    return RULES.map(r => ({
        id: r.id,
        description: r.description,
        severity: r.severity
    }));
}

// EXPORTS
module.exports = {
    validatePayload,
    validateBatch,
    getValidationRules
};
