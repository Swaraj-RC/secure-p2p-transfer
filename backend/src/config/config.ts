import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_change_me',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '50mb',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  },
  pingIntervalMs: 30000,
  deviceInactivityTimeoutMs: 60000,
};
