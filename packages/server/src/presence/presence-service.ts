// ═══════════════════════════════════════════════════════════════
// Presence Service — Online Status & Heartbeat Tracking
// ═══════════════════════════════════════════════════════════════

import { getRedis } from '../redis/client';
import { REDIS_KEYS } from '../config';
import type { UserPresence } from '@anisync/shared';

const PRESENCE_TTL = 60; // seconds before considered offline


export async function setOnline(userId: string, roomId?: string): Promise<void> {
  const redis = getRedis();
  const presence: UserPresence = {
    userId,
    status: roomId ? 'watching' : 'online',
    roomId: roomId ?? null,
    currentAnime: null,
    lastHeartbeat: Date.now(),
  };
  await redis.setex(REDIS_KEYS.userPresence(userId), PRESENCE_TTL, JSON.stringify(presence));
  await redis.sadd(REDIS_KEYS.onlineUsers, userId);
}

export async function setOffline(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(REDIS_KEYS.userPresence(userId));
  await redis.srem(REDIS_KEYS.onlineUsers, userId);
}

export async function heartbeat(userId: string): Promise<void> {
  const redis = getRedis();
  const raw = await redis.get(REDIS_KEYS.userPresence(userId));
  if (raw) {
    const presence: UserPresence = JSON.parse(raw);
    presence.lastHeartbeat = Date.now();
    await redis.setex(REDIS_KEYS.userPresence(userId), PRESENCE_TTL, JSON.stringify(presence));
  } else {
    await setOnline(userId);
  }
}

export async function getPresence(userId: string): Promise<UserPresence | null> {
  const raw = await getRedis().get(REDIS_KEYS.userPresence(userId));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function getOnlineUsers(): Promise<string[]> {
  return getRedis().smembers(REDIS_KEYS.onlineUsers);
}

export async function getOnlineFriends(_userId: string, friendIds: string[]): Promise<UserPresence[]> {
  if (friendIds.length === 0) return [];
  const redis = getRedis();
  const pipeline = redis.pipeline();
  friendIds.forEach(id => pipeline.get(REDIS_KEYS.userPresence(id)));
  const results = await pipeline.exec();
  return (results ?? [])
    .map((res: any) => res[1] ? JSON.parse(res[1] as string) as UserPresence : null)
    .filter((p: any): p is UserPresence => p !== null);
}

// ─── Socket Tracking ──────────────────────────────────────────

export async function addSocket(userId: string, socketId: string): Promise<void> {
  await getRedis().sadd(REDIS_KEYS.userSockets(userId), socketId);
}

export async function removeSocket(userId: string, socketId: string): Promise<number> {
  const redis = getRedis();
  await redis.srem(REDIS_KEYS.userSockets(userId), socketId);
  return redis.scard(REDIS_KEYS.userSockets(userId));
}

export async function getUserSockets(userId: string): Promise<string[]> {
  return getRedis().smembers(REDIS_KEYS.userSockets(userId));
}
