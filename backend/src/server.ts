import http from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { createApp } from './app';
import { config } from './config/config';
import { WebSocketController } from './controllers/websocketController';
import { logger } from './utils/logger';

const app = createApp();
const server = http.createServer(app);

// WebSocket Server — raise maxPayload for large chunk relay and enable compression
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 200 * 1024 * 1024, // 200 MB max WS frame
  perMessageDeflate: {
    zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
    zlibInflateOptions: { chunkSize: 10 * 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024, // Only compress messages > 1KB
  },
});
new WebSocketController(wss);

server.listen(config.port, config.host, () => {
  logger.info(`=======================================================`);
  logger.info(`⚡ SLRV BEAM Signaling Server running on ${config.host}:${config.port}`);
  logger.info(`👥 Engineered by: Swaraj, Laxmikant, Rahul, Vaibhav`);
  logger.info(`📡 HTTP Endpoint: http://${config.host}:${config.port}/api`);
  logger.info(`⚡ WebSocket Endpoint: ws://${config.host}:${config.port}/ws`);
  logger.info(`🔒 Environment: ${config.nodeEnv}`);
  logger.info(`=======================================================`);
});

// Graceful shutdown handling
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  wss.close(() => {
    logger.info('WebSocket server closed.');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
