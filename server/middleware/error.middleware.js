/**
 * TrustChain: Global error handling middleware
 * catches all server errors, formats them into a clean JSON response, and prevents the Node.js server process from crashing.
 */

// 1. catches requests to routes that don't exist (404)
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Resource Not Found: [${req.method}] ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

// 2. Global error boundary (express identifies this by the 4 arguments)
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    const errorMessage = err.message || 'An unexpected internal server error occurred.';

    // print a clean alert to the console for easy debugging
    console.error(`\n❌ [ERROR] ${new Date().toLocaleTimeString()} - Status ${statusCode}`);
    console.error(`Route: ${req.method} ${req.originalUrl}`);
    console.error(`Message: ${errorMessage}`);
    if (process.env.NODE_ENV === 'development' && err.stack) {
        console.error(`Stack: ${err.stack.split('\n')[1]}`);
    }

    // send back a structured error format to the client
    res.status(statusCode).json({
        success: false,
        error: {
            code: statusCode,
            message: errorMessage,
            path: req.originalUrl,
            timestamp: new Date().toISOString()
        }
    });
};

module.exports = {
    notFoundHandler,
    errorHandler
};