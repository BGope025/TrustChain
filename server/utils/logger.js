/**
 * TrustChain: Structured Logger
 * A lightweight wrapper simulating Winston/Pino for the hackathon MVP.
 * In a production app, this would format JSON logs and ship them to Datadog/Splunk.
 */

const env = require('../config/env');

const LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const currentLevel = LEVELS[env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'];

function _log(levelName, message, meta = {}) {
    if (LEVELS[levelName] < currentLevel) return;

    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    
    let prefix = `[${timestamp}] [${levelName}]`;
    
    // Simple color coding for console
    switch (levelName) {
        case 'INFO': prefix = `\x1b[36m${prefix}\x1b[0m`; break;
        case 'WARN': prefix = `\x1b[33m${prefix}\x1b[0m`; break;
        case 'ERROR': prefix = `\x1b[31m${prefix}\x1b[0m`; break;
        case 'DEBUG': prefix = `\x1b[90m${prefix}\x1b[0m`; break;
    }

    console.log(`${prefix} ${message}${metaString}`);
}

module.exports = {
    debug: (msg, meta) => _log('DEBUG', msg, meta),
    info:  (msg, meta) => _log('INFO', msg, meta),
    warn:  (msg, meta) => _log('WARN', msg, meta),
    error: (msg, meta) => _log('ERROR', msg, meta)
};
