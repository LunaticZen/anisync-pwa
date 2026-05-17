// ═══════════════════════════════════════════════════════════════
// Redis Client — Cache, PubSub, and Session Store
// ═══════════════════════════════════════════════════════════════

import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;
let redisSub: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      reconnectOnError(err) {
        console.error('[Redis] Connection error:', err.message);
        return true;
      },
    });

    redisClient.on('connect', () => console.log('[Redis] Connected'));
    redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
  }
  return redisClient;
}

export function getRedisSub(): Redis {
  if (!redisSub) {
    redisSub = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
    });
  }
  return redisSub;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) { await redisClient.quit(); redisClient = null; }
  if (redisSub) { await redisSub.quit(); redisSub = null; }
}

// ─── Convenience Helpers ──────────────────────────────────────

export async function setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
  await getRedis().setex(key, ttlSeconds, value);
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const json = JSON.stringify(value);
  if (ttlSeconds) {
    await getRedis().setex(key, ttlSeconds, json);
  } else {
    await getRedis().set(key, json);
  }
}
