/**
 * TrustChain: WebSocket Server
 * Manages the real-time Socket.io (or WS) connection for the live dashboard.
 * Broadcasts agent lifecycle events, x402 payments, and system logs.
 */

const { Server } = require('socket.io');

let io = null;

/**
 * Initializes the WebSocket server.
 *
 * @param {Object} httpServer - The underlying Node HTTP server
 */
function init(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`📡 [WebSocket] Client connected: ${socket.id}`);

        // Handle channel subscriptions
        socket.on('subscribe', (channel) => {
            socket.join(channel);
            console.log(`🔌 [WebSocket] Client ${socket.id} joined channel: ${channel}`);
        });

        socket.on('unsubscribe', (channel) => {
            socket.leave(channel);
        });

        socket.on('disconnect', () => {
            console.log(`📡 [WebSocket] Client disconnected: ${socket.id}`);
        });
    });

    console.log(`✅ [WebSocket] Server initialized and ready for connections.`);
    return io;
}

/**
 * Gets the initialized Socket.io instance.
 */
function getIO() {
    if (!io) {
        throw new Error('WebSocket Server has not been initialized.');
    }
    return io;
}

module.exports = {
    init,
    getIO
};
