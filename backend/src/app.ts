import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permit WebSocket/WebRTC connections
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { success: false, error: 'Too many requests from this IP' },
  });
  app.use('/api', limiter);

  // Body Parsing
  app.use(express.json({ limit: config.maxPayloadSize }));
  app.use(express.urlencoded({ extended: true, limit: config.maxPayloadSize }));

  // API Routes
  app.use('/api', apiRoutes);

  // Serve React Frontend static build (production mode)
  // Looks for the frontend dist folder relative to the backend project root
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  // SPA fallback: serve index.html for any non-API, non-static route
  app.get('*', (req, res, next) => {
    // Don't interfere with API routes or WebSocket upgrade
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) {
        // Frontend not built yet — return a helpful message
        res.status(200).send(`
          <html><body style="background:#0a0a0a;color:#ff6b00;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
            <h1>⚡ P2P TRANSFER SERVER ONLINE</h1>
            <p style="color:#888">Frontend not built yet. Run: <code style="color:#ff6b00">cd frontend && npm run build</code></p>
            <p style="color:#888">Then refresh this page.</p>
            <p style="color:#555;margin-top:2rem">API: <a href="/api/health" style="color:#ff6b00">/api/health</a> • WebSocket: ws://this-host/ws</p>
          </body></html>
        `);
      }
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
