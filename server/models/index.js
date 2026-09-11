/**
 * TrustChain: Models Index / Connection Pool
 * In a production app, this would initialize Sequelize, Mongoose, or Prisma.
 * For the hackathon MVP, we use this as a central export hub for our
 * in-memory entity schemas.
 */

const User = require('./User');
const Agent = require('./Agent');
const Wallet = require('./Wallet');
const Provider = require('./Provider');
const Service = require('./Service');
const Payment = require('./Payment');
const Transaction = require('./Transaction');
const Reputation = require('./Reputation');
const AuditLog = require('./AuditLog');

/**
 * Mocks a database connection initialization.
 */
async function connectDB() {
    console.log('🗄️  [Database] Connected to in-memory data store.');
    return true;
}

module.exports = {
    connectDB,
    User,
    Agent,
    Wallet,
    Provider,
    Service,
    Payment,
    Transaction,
    Reputation,
    AuditLog
};
