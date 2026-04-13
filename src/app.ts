import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import { pool } from './database';

import authRoutes from './routes/auth';
import cabinetRoutes from './routes/cabinets';
import subRoutes from './routes/subs';
import itemRoutes from './routes/items';
import adminRoutes from './routes/admin';
import backupRoutes from './routes/backup';
import aiRoutes from './routes/ai';
import dashboardRoutes from './routes/dashboard';
import historyRoutes from './routes/history';
import userRoutes from './routes/user';

const UPLOADS_DIR = './uploads';

export async function createApp() {
  const app = express();
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  // Ensure dirs exist
  if (!fs.existsSync('./data')) fs.mkdirSync('./data');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

  // Middleware
  app.use(express.json());
  app.use(cookieParser());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Request logger
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health checks (no auth)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(503).json({ status: 'not ready', error: 'database error' });
    }
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/cabinets', cabinetRoutes);
  app.use('/api/subs', subRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api', backupRoutes); // /api/backup (GET) + /api/restore (POST)

  // Serve static files in production
  if (IS_PRODUCTION) {
    const distPath = path.join(process.cwd(), 'dist');
    const assetsPath = path.join(distPath, 'assets');

    app.use('/assets', express.static(assetsPath, {
      maxAge: '1d',
      immutable: true
    }));

    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}
