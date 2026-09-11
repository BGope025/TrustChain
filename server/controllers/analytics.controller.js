const analyticsService = require('../services/analytics.service');

/**
 * TrustChain: Analytics Controller
 * Handles HTTP request/response for system throughput dashboards,
 * cost reports, time-series data, and per-service deep dives.
 * Delegates all logic to analytics.service.js.
 */

// 1. GET SYSTEM THROUGHPUT DASHBOARD
// Handler for: GET /api/analytics/throughput
function getSystemThroughput(req, res) {
    const throughput = analyticsService.getSystemThroughput();

    res.json({
        success: true,
        throughput
    });
}

// 2. GET COST AGGREGATION REPORT
// Handler for: GET /api/analytics/costs
function getCostReport(req, res) {
    const costs = analyticsService.getCostReport();

    res.json({
        success: true,
        costs
    });
}

// 3. GET HOURLY TIME-SERIES (Sparkline Data)
// Handler for: GET /api/analytics/timeseries
function getTimeSeries(req, res) {
    const timeSeries = analyticsService.getHourlyTimeSeries();

    res.json({
        success: true,
        count: timeSeries.length,
        timeSeries
    });
}

// 4. GET PER-SERVICE ANALYTICS DEEP DIVE
// Handler for: GET /api/analytics/service/:serviceId
function getServiceAnalytics(req, res) {
    const { serviceId } = req.params;
    const analytics = analyticsService.getServiceAnalytics(serviceId);

    if (!analytics) {
        return res.status(404).json({
            success: false,
            error: `No analytics data found for service: ${serviceId}`
        });
    }

    res.json({
        success: true,
        analytics
    });
}

// 5. RECORD AN ANALYTICS EVENT (Internal Hook)
// Handler for: POST /api/analytics/record
function recordEvent(req, res) {
    const { serviceId, serviceName, provider, cost, latencyMs, txHash, success } = req.body;

    if (!serviceId || !serviceName) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: serviceId and serviceName are mandatory.'
        });
    }

    analyticsService.recordEvent({
        serviceId,
        serviceName,
        provider: provider || 'Unknown',
        cost: Number(cost) || 0,
        latencyMs: Number(latencyMs) || 0,
        txHash: txHash || null,
        success: success !== false // Default to true
    });

    res.json({
        success: true,
        message: 'Analytics event recorded successfully.'
    });
}

// 6. RESET ANALYTICS (Demo Reset)
// Handler for: POST /api/analytics/reset
function resetAnalytics(req, res) {
    analyticsService.resetAnalytics();

    res.json({
        success: true,
        message: 'All analytics metrics have been reset.'
    });
}

// EXPORTS
module.exports = {
    getSystemThroughput,
    getCostReport,
    getTimeSeries,
    getServiceAnalytics,
    recordEvent,
    resetAnalytics
};
