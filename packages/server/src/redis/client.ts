// ═══════════════════════════════════════════════════════════════
// Redis Client — In-Memory Fallback (No Docker Required)
// Uses real Redis when available, falls back to Map-based store
// ═══════════════════════════════════════════════════════════════

import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;
let usingFallback = false;

// ─── In-Memory Fallback (replaces Redis when not available) ──

class MemoryStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private sets = new Map<string, Set<string>>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.value;
  }
  async set(key: string, value: string): Promise<'OK'> { this.store.set(key, { value }); return 'OK'; }
  async setex(key: string, ttl: number, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 }); return 'OK';
  }
  async del(...keys: string[]): Promise<number> { keys.forEach(k => this.store.delete(k)); return keys.length; }
  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const val = entry ? parseInt(entry.value) + 1 : 1;
    this.store.set(key, { value: String(val), expiresAt: entry?.expiresAt }); return val;
  }
  async expire(key: string, ttl: number): Promise<number> {
    const entry = this.store.get(key);
    if (entry) { entry.expiresAt = Date.now() + ttl * 1000; return 1; } return 0;
  }
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    members.forEach(m => this.sets.get(key)!.add(m)); return members.length;
  }
  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    members.forEach(m => set.delete(m)); return members.length;
  }
  async smembers(key: string): Promise<string[]> { return [...(this.sets.get(key) ?? [])]; }
  async scard(key: string): Promise<number> { return this.sets.get(key)?.size ?? 0; }
  async zadd(key: string, _score: number, member: string): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    this.sets.get(key)!.add(member); return 1;
  }
  async zrem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    members.forEach(m => set.delete(m)); return members.length;
  }
  async ping(): Promise<string> { return 'PONG'; }
  pipeline() { return new MemoryPipeline(this); }
}

class MemoryPipeline {
  private ops: (() => Promise<any>)[] = [];
  constructor(private store: MemoryStore) {}
  get(key: string) { this.ops.push(() => this.store.get(key)); return this; }
  exec() { return Promise.all(this.ops.map(op => op().then(r => [null, r]).catch(e => [e, null]))); }
}

const memoryStore = new MemoryStore();

// ─── Get Redis (or fallback) ─────────────────────────────────

export function getRedis(): any {
  if (usingFallback) return memoryStore;

  if (!redisClient) {
    try {
      redisClient = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy(times) {
          if (times > 2) {
            console.log('[Redis] Falling back to in-memory store');
            usingFallback = true;
            return null; // stop retrying
          }
          return Math.min(times * 200, 1000);
        },
      });

      redisClient.on('error', () => {
        if (!usingFallback) {
          usingFallback = true;
          console.log('[Redis] Error — using in-memory fallback');
        }
      });
    } catch {
      usingFallback = true;
      return memoryStore;
    }
  }
  return usingFallback ? memoryStore : redisClient;
}

export function getRedisSub(): any {
  return getRedis(); // In fallback mode, just return the same store
}

export async function closeRedis(): Promise<void> {
  if (redisClient && !usingFallback) { await redisClient.quit(); redisClient = null; }
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
