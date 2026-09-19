// ═══════════════════════════════════════════════════════════════
// AniSync Server — Entry Point
// Express + Socket.IO + PostgreSQL + Redis
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { getDb, closeDb } from './db/client';
import { getRedis, closeRedis } from './redis/client';
import { initWebSocket } from './ws/gateway';
import apiRoutes from './routes/api';
import { rateLimitMiddleware, sanitizeBody, errorHandler } from './middleware';

async function main() {
  console.log('─────────────────────────────────────────');
  console.log('  AniSync Server v1.0.0');
  console.log(`  Environment: ${config.NODE_ENV}`);
  console.log(`  Port: ${config.PORT}`);
  console.log('─────────────────────────────────────────');

  // ── Express Setup ──
  const app = express();
  const httpServer = createServer(app);

  // ── Security Headers ──
  app.use(helmet({
    contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
  }));

  // ── CORS ──
  app.use(cors({
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── Body Parsing ──
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // ── Logging ──
  if (config.NODE_ENV !== 'test') {
    app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // ── Global Middleware ──
  app.use(sanitizeBody);
  app.use('/api', rateLimitMiddleware());

  // ── Routes ──
  app.use('/api', apiRoutes);


  
  // ── Serve Videos ──
  app.use('/videolar', express.static('/www/wwwroot/176.96.131.15/videolar'));

  // ── Serve Frontend ──
  const desktopDist = path.join(__dirname, '../../desktop/dist');
  app.use(express.static(desktopDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(desktopDist, 'index.html'));
  });

  // ── Error Handler ──

  app.use(errorHandler);

  // ── Database Connection ──
  try {
    const db = getDb();
    await db.$connect();
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err);
    console.log('⚠️  Continuing without database (run docker-compose up first)');
  }

  // ── Redis Connection ──
  try {
    const redis = getRedis();
    await redis.ping();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    console.log('⚠️  Continuing without Redis');
  }

  // ── WebSocket ──
  initWebSocket(httpServer);
  console.log('✅ Socket.IO initialized');

  // ── Start Server ──
  httpServer.listen(config.PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`📡 WebSocket on ws://localhost:${config.PORT}`);
    console.log(`📋 API at http://localhost:${config.PORT}/api`);
    console.log(`💚 Health: http://localhost:${config.PORT}/api/health`);
    console.log('─────────────────────────────────────────');
  });

  // ── Graceful Shutdown ──
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close();
    await closeDb();
    await closeRedis();
    console.log('Server closed.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}

main().catch(console.error);
