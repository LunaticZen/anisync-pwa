// ═══════════════════════════════════════════════════════════════
// Chat Service — Real-time Messaging & Moderation
// ═══════════════════════════════════════════════════════════════

import { getDb } from '../db/client';
import { getRedis } from '../redis/client';
import { REDIS_KEYS } from '../config';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { MAX_MESSAGE_LENGTH, RATE_LIMITS } from '@anisync/shared';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

// ─── Spam Detection ───────────────────────────────────────────

const recentMessages = new Map<string, { text: string; time: number }[]>();

function isSpam(userId: string, text: string): boolean {
  const history = recentMessages.get(userId) ?? [];
  const now = Date.now();

  // Remove old entries (>30s)
  const recent = history.filter(m => now - m.time < 30000);

  // Check for duplicate messages
  const duplicates = recent.filter(m => m.text === text);
  if (duplicates.length >= 3) return true;

  // Update history
  recent.push({ text, time: now });
  recentMessages.set(userId, recent.slice(-20));

  return false;
}

// ─── Rate Limiting ────────────────────────────────────────────

export async function checkChatRateLimit(userId: string): Promise<boolean> {
  const redis = getRedis();
  const key = REDIS_KEYS.rateLimitChat(userId);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count <= RATE_LIMITS.CHAT_MESSAGES_PER_MINUTE;
}

// ─── Message Processing ──────────────────────────────────────

export function sanitizeMessage(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('[upload:data:image/') && trimmed.endsWith(']')) {
    if (trimmed.length > 500000) return '';
    return trimmed;
  }
  // Strip HTML tags
  let clean = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // Trim and limit length
  clean = clean.trim().slice(0, MAX_MESSAGE_LENGTH);
  return clean;
}

export async function saveMessage(data: {
  roomId: string;
  userId: string;
  text: string;
  type?: string;
  bubbleTheme?: string;
}) {
  const db = getDb();

  const sanitized = sanitizeMessage(data.text);
  if (!sanitized) return null;

  // Spam check
  if (isSpam(data.userId, sanitized)) return null;

  // Rate limit check
  const allowed = await checkChatRateLimit(data.userId);
  if (!allowed) return null;

  const user = await db.user.findUnique({
    where: { id: data.userId },
    select: { username: true, displayName: true, avatarUrl: true },
  });
  if (!user) return null;

  const message = await db.message.create({
    data: {
      roomId: data.roomId,
      userId: data.userId,
      text: sanitized,
      type: data.type ?? 'text',
      bubbleTheme: data.bubbleTheme || null,
    },
  });

  return {
    id: message.id,
    roomId: message.roomId,
    userId: message.userId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    text: message.text,
    type: message.type as any,
    reactions: JSON.parse(message.reactions as any),
    createdAt: message.createdAt.toISOString(),
    editedAt: null,
    bubbleTheme: message.bubbleTheme || undefined,
  };
}

export async function addReaction(messageId: string, userId: string, emoji: string) {
  const db = getDb();
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return null;

  const reactions = (message.reactions as unknown as any[]) ?? [];
  const existing = reactions.find((r: any) => r.emoji === emoji);

  if (existing) {
    if (existing.users.includes(userId)) {
      // Remove reaction
      existing.users = existing.users.filter((u: string) => u !== userId);
      existing.count = existing.users.length;
      if (existing.count === 0) {
        const idx = reactions.indexOf(existing);
        reactions.splice(idx, 1);
      }
    } else {
      existing.users.push(userId);
      existing.count = existing.users.length;
    }
  } else {
    reactions.push({ emoji, users: [userId], count: 1 });
  }

  await db.message.update({ where: { id: messageId }, data: { reactions: reactions as any } });
  return reactions;
}

export async function deleteMessage(messageId: string, userId: string, roomId: string) {
  const db = getDb();
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return false;

  // Only author or host/mod can delete
  if (message.userId !== userId) {
    const member = await db.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!member || member.role === 'viewer') return false;
  }

  await db.message.delete({ where: { id: messageId } });
  return true;
}

export async function getRoomMessages(roomId: string, limit = 50, before?: string) {
  const db = getDb();
  const where: any = { roomId };
  if (before) {
    const beforeMsg = await db.message.findUnique({ where: { id: before } });
    if (beforeMsg) where.createdAt = { lt: beforeMsg.createdAt };
  }

  const messages = await db.message.findMany({
    where,
    include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages.reverse().map((m: any) => ({
    id: m.id, roomId: m.roomId, userId: m.userId,
    username: m.user.username, displayName: m.user.displayName,
    avatarUrl: m.user.avatarUrl, text: m.text, type: m.type,
    reactions: m.reactions ?? [], createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
  }));
}
