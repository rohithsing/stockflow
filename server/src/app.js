import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { dashboardRouter } from './routes/dashboard.js';
import { settingsRouter } from './routes/settings.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.use('/api/auth', authRouter);
  app.use('/api/products', requireAuth, productsRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/settings', requireAuth, settingsRouter);

  app.use('/api', notFoundHandler);

  // In production the built React bundle is served by this same process, so the
  // whole app is one deployable unit.
  const indexHtml = path.join(config.clientDistDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.clientDistDir));
    app.get('*', (req, res) => res.sendFile(indexHtml));
  }

  app.use(errorHandler);
  return app;
}
