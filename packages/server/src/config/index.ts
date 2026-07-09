// ═══════════════════════════════════════════════════════════════
// Server Configuration — Environment & Constants
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://anisync:anisync_dev_2024@localhost:5432/anisync'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production-anisync-2024'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-in-production-2024'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3001'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

export const REDIS_KEYS = {
  roomState: (roomId: string) => `room:${roomId}:sync`,
  roomMembers: (roomId: string) => `room:${roomId}:members`,
  userPresence: (userId: string) => `presence:${userId}`,
  userSockets: (userId: string) => `sockets:${userId}`,
  rateLimitApi: (ip: string) => `ratelimit:api:${ip}`,
  rateLimitChat: (userId: string) => `ratelimit:chat:${userId}`,
  rateLimitAuth: (ip: string) => `ratelimit:auth:${ip}`,
  roomDiscovery: 'rooms:public:active',
  onlineUsers: 'users:online',
} as const;

export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
