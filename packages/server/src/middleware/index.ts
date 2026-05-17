// ═══════════════════════════════════════════════════════════════
// Security Middleware — Auth, Rate Limiting, Sanitization
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AuthError } from '../auth/auth-service';
import { getRedis } from '../redis/client';
import { REDIS_KEYS } from '../config';
import { RATE_LIMITS } from '@anisync/shared';

// ─── JWT Auth Middleware ──────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; username: string };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Token gerekli' } });
    return;
  }

  try {
    const token = authHeader.slice(7);
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Kimlik doğrulama hatası' } });
    return;
  }
}

// ─── API Rate Limiting ────────────────────────────────────────

export function rateLimitMiddleware(maxRequests = RATE_LIMITS.API_REQUESTS_PER_MINUTE) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = REDIS_KEYS.rateLimitApi(ip);
    const redis = getRedis();

    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > maxRequests) {
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Çok fazla istek. Lütfen bekleyin.' },
        });
        return;
      }
    } catch {
      // Redis down — allow through
    }
    next();
  };
}

// ─── Auth Rate Limiting ───────────────────────────────────────

export function authRateLimitMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = REDIS_KEYS.rateLimitAuth(ip);
    const redis = getRedis();

    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > RATE_LIMITS.LOGIN_ATTEMPTS_PER_MINUTE) {
        res.status(429).json({
          success: false,
          error: { code: 'AUTH_RATE_LIMITED', message: 'Çok fazla giriş denemesi. 1 dakika bekleyin.' },
        });
        return;
      }
    } catch { /* pass */ }
    next();
  };
}

// ─── Input Sanitization ──────────────────────────────────────

export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      // Remove null bytes and control characters
      obj[key] = obj[key].replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// ─── Error Handler ────────────────────────────────────────────

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', err);

  if (err instanceof AuthError) {
    res.status(401).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }

  const status = (err as any).status ?? 500;
  res.status(status).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Sunucu hatası' : err.message,
    },
  });
}
