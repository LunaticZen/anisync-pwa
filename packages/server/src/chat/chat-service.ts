// ═══════════════════════════════════════════════════════════════
// Chat Service — Real-time Messaging & Moderation (In-Memory)
// ═══════════════════════════════════════════════════════════════

import { getRedis } from '../redis/client';
import { REDIS_KEYS } from '../config';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { MAX_MESSAGE_LENGTH, RATE_LIMITS } from '@anisync/shared';
import * as crypto from 'crypto';
import * as roomService from '../rooms/room-service';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

// In-Memory Storage for chat messages
const messagesByRoom = new Map<string, any[]>();

export function clearRoomMessages(roomId: string) {
  messagesByRoom.delete(roomId);
}

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
  username: string; // Add username since we don't fetch from DB
  text: string;
  type?: string;
  bubbleTheme?: string;
}) {
  const sanitized = sanitizeMessage(data.text);
  if (!sanitized) return null;

  // Spam check
  if (isSpam(data.userId, sanitized)) return null;

  // Rate limit check
  const allowed = await checkChatRateLimit(data.userId);
  if (!allowed) return null;

  const msgId = crypto.randomUUID();
  const message = {
    id: msgId,
    roomId: data.roomId,
    userId: data.userId,
    username: data.username,
    displayName: data.username,
    avatarUrl: null,
    text: sanitized,
    type: data.type ?? 'text',
    reactions: [],
    createdAt: new Date().toISOString(),
    editedAt: null,
    bubbleTheme: data.bubbleTheme || undefined,
  };

  const roomMsgs = messagesByRoom.get(data.roomId) || [];
  roomMsgs.push(message);
  // Keep last 100 messages max
  if (roomMsgs.length > 100) roomMsgs.shift();
  messagesByRoom.set(data.roomId, roomMsgs);

  return message;
}

export async function addReaction(messageId: string, userId: string, emoji: string) {
  let foundMsg = null;
  for (const msgs of messagesByRoom.values()) {
    foundMsg = msgs.find(m => m.id === messageId);
    if (foundMsg) break;
  }
  if (!foundMsg) return null;

  const reactions = foundMsg.reactions ?? [];
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

  foundMsg.reactions = reactions;
  return reactions;
}

export async function deleteMessage(messageId: string, userId: string, roomId: string) {
  const roomMsgs = messagesByRoom.get(roomId);
  if (!roomMsgs) return false;

  const msgIdx = roomMsgs.findIndex(m => m.id === messageId);
  if (msgIdx === -1) return false;
  const message = roomMsgs[msgIdx];

  // Only author or host/mod can delete
  if (message.userId !== userId) {
    // Check if user is host or mod
    const room = roomService.getRoom(roomId);
    if (!room) return false;
    const member = room.members.get(userId);
    if (!member || member.role === 'viewer') return false;
  }

  roomMsgs.splice(msgIdx, 1);
  return true;
}

export async function getRoomMessages(roomId: string, limit = 50, before?: string) {
  const msgs = messagesByRoom.get(roomId) || [];
  // For simplicity, returning the latest up to 'limit'
  let result = [...msgs];
  if (before) {
    const idx = result.findIndex(m => m.id === before);
    if (idx !== -1) {
      result = result.slice(0, idx);
    }
  }
  return result.slice(-limit);
}
