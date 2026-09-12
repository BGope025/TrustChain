const express = require('express');
const cors = require('cors');

// Import Middlewares
const { requestLogger } = require('./middleware/logger.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Import Master Router
const apiRoutes = require('./routes/index');

const app = express();

// 1. Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// --- ADDED: Health Check Route for Render ---
// This handles both GET and HEAD requests to the root directory
app.get('/', (req, res) => {
    res.status(200).send("TrustChain Backend is LIVE and healthy!");
});
// --------------------------------------------

// 2. Mount API Routes
app.use('/api', apiRoutes);

// 3. Fallback Route (404 Not Found)
app.use(notFoundHandler);

// 4. Global Error Handler
app.use(errorHandler);

module.exports = app;