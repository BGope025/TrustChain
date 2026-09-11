const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'news-api', x402_verified: req.x402Context ? req.x402Context.verified : false });
});

// Add your specific mock routes here
router.get('/data', (req, res) => {
    res.json({ message: 'Mock data from news-api' });
});

module.exports = router;
