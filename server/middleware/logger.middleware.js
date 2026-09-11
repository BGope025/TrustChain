/**
 * TrustChain: request logger middleware
 * logs incoming HTTP requests, response statuses, and execution latency.
 */

const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toLocaleTimeString();

    // listen for the response to finish before calculating duration
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // choose an indicator based on HTTP status code
        let statusIndicator = '🟢'; // 2xx Success
        if (statusCode === 402) {
            statusIndicator = '💳'; // HTTP 402 Payment Required (x402 handshake)
        } else if (statusCode >= 400 && statusCode < 500) {
            statusIndicator = '🟡'; // 4xx Client Error / Auth failure
        } else if (statusCode >= 500) {
            statusIndicator = '🔴'; // 5xx Server Error
        }

        console.log(
            `${statusIndicator} [${timestamp}] ${req.method.padEnd(6)} ` +
            `${req.originalUrl.padEnd(25)} ` +
            `Status: ${statusCode} | Latency: ${duration}ms`
        );
    });

    next();
};

module.exports = {
    requestLogger
};