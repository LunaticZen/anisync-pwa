// ═══════════════════════════════════════════════════════════════
// Room Service — Room CRUD, Lifecycle & Discovery
// ═══════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/client';
import { getRedis, setJson, getJson } from '../redis/client';
import { config, REDIS_KEYS, ROOM_CODE_CHARS } from '../config';
import { createInitialSyncState, type SyncState } from '@anisync/shared';
import type { RoomSettings } from '@anisync/shared';

const DEFAULT_SETTINGS: RoomSettings = {
  syncMode: 'host-authority',
  allowGuestControl: false,
  bufferingPolicy: 'wait-threshold',
  driftThresholdMs: 500,
  maxMembers: 10,
  chatEnabled: true,
  slowMode: 0,
};

// ─── Room Code Generator ──────────────────────────────────────

function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

async function uniqueRoomCode(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const exists = await db.room.findUnique({ where: { code } });
    if (!exists) return code;
  }
  // Fallback: longer code
  return generateRoomCode(8);
}

// ─── Service Functions ────────────────────────────────────────

export async function createRoom(hostId: string, data: {
  name: string;
  isPublic: boolean;
  password?: string;
  maxMembers?: number;
  settings?: Partial<RoomSettings>;
}) {
  const db = getDb();
  const code = await uniqueRoomCode();
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
  const settings = { ...DEFAULT_SETTINGS, ...data.settings };

  const room = await db.room.create({
    data: {
      code,
      name: data.name.trim().slice(0, 50),
      isPublic: data.isPublic,
      passwordHash,
      hostId,
      maxMembers: data.maxMembers ?? 10,
      settings: JSON.parse(JSON.stringify(settings)),
      members: { create: { userId: hostId, role: 'host' } },
    },
    include: {
      members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  // Initialize sync state in Redis
  const syncState = createInitialSyncState();
  await setJson(REDIS_KEYS.roomState(room.id), syncState);

  // Add to public discovery if public
  if (data.isPublic) {
    await getRedis().zadd(REDIS_KEYS.roomDiscovery, Date.now(), room.id);
  }

  return formatRoomResponse(room, settings, syncState);
}

export async function joinRoom(userId: string, code: string, password?: string) {
  const db = getDb();
  const room = await db.room.findUnique({
    where: { code, isActive: true },
    include: {
      members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
    },
  });

  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');
  if (room.members.length >= room.maxMembers) throw new RoomError('ROOM_FULL', 'Oda dolu');

  // Check if already a member
  const existing = room.members.find(m => m.userId === userId);
  if (existing) {
    const syncState = await getRoomSyncState(room.id);
    const settings = room.settings as unknown as RoomSettings;
    return { room: formatRoomResponse(room, settings, syncState), syncState };
  }

  // Password check
  if (room.passwordHash) {
    if (!password) throw new RoomError('PASSWORD_REQUIRED', 'Bu oda şifreli');
    const valid = await bcrypt.compare(password, room.passwordHash);
    if (!valid) throw new RoomError('INVALID_PASSWORD', 'Yanlış şifre');
  }

  // Add member
  await db.roomMember.create({ data: { userId, roomId: room.id, role: 'viewer' } });
  await db.room.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } });

  const updatedRoom = await db.room.findUnique({
    where: { id: room.id },
    include: {
      members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
    },
  });

  const syncState = await getRoomSyncState(room.id);
  const settings = room.settings as unknown as RoomSettings;
  return { room: formatRoomResponse(updatedRoom!, settings, syncState), syncState };
}

export async function leaveRoom(userId: string, roomId: string): Promise<{ roomClosed: boolean; newHostId?: string }> {
  const db = getDb();
  await db.roomMember.deleteMany({ where: { userId, roomId } });

  const remaining = await db.roomMember.findMany({ where: { roomId } });

  if (remaining.length === 0) {
    // Close room
    await db.room.update({ where: { id: roomId }, data: { isActive: false } });
    await cleanupRoomRedis(roomId);
    return { roomClosed: true };
  }

  // Transfer host if needed
  const room = await db.room.findUnique({ where: { id: roomId } });
  if (room?.hostId === userId) {
    const newHost = remaining[0];
    await db.room.update({ where: { id: roomId }, data: { hostId: newHost.userId } });
    await db.roomMember.update({ where: { userId_roomId: { userId: newHost.userId, roomId } }, data: { role: 'host' } });
    return { roomClosed: false, newHostId: newHost.userId };
  }

  return { roomClosed: false };
}

export async function kickMember(roomId: string, targetUserId: string, byUserId: string) {
  const db = getDb();
  const kicker = await db.roomMember.findUnique({ where: { userId_roomId: { userId: byUserId, roomId } } });
  if (!kicker || (kicker.role !== 'host' && kicker.role !== 'moderator')) {
    throw new RoomError('FORBIDDEN', 'Yetkiniz yok');
  }
  const target = await db.roomMember.findUnique({ where: { userId_roomId: { userId: targetUserId, roomId } } });
  if (!target) throw new RoomError('NOT_MEMBER', 'Kullanıcı odada değil');
  if (target.role === 'host') throw new RoomError('CANNOT_KICK_HOST', 'Host atılamaz');

  await db.roomMember.delete({ where: { userId_roomId: { userId: targetUserId, roomId } } });
}

export async function updateSettings(roomId: string, userId: string, updates: Partial<RoomSettings>) {
  const db = getDb();
  const member = await db.roomMember.findUnique({ where: { userId_roomId: { userId, roomId } } });
  if (!member || member.role !== 'host') throw new RoomError('FORBIDDEN', 'Sadece host ayarları değiştirebilir');

  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');

  const currentSettings = room.settings as unknown as RoomSettings;
  const newSettings = { ...currentSettings, ...updates };
  await db.room.update({ where: { id: roomId }, data: { settings: JSON.parse(JSON.stringify(newSettings)) } });
  return newSettings;
}

export async function discoverRooms(page = 1, pageSize = 20, sort: 'trending' | 'newest' | 'members' = 'trending') {
  const db = getDb();
  const skip = (page - 1) * pageSize;

  const orderBy = sort === 'newest' ? { createdAt: 'desc' as const }
    : sort === 'members' ? { members: { _count: 'desc' as const } }
    : { lastActiveAt: 'desc' as const };

  const [rooms, total] = await Promise.all([
    db.room.findMany({
      where: { isPublic: true, isActive: true },
      include: {
        _count: { select: { members: true } },
        host: { select: { displayName: true, avatarUrl: true } },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    db.room.count({ where: { isPublic: true, isActive: true } }),
  ]);

  return {
    rooms: rooms.map(r => ({
      id: r.id, code: r.code, name: r.name, isPublic: true,
      hasPassword: !!r.passwordHash, hostId: r.hostId,
      maxMembers: r.maxMembers, memberCount: r._count.members,
      createdAt: r.createdAt.toISOString(), currentAnime: r.currentAnime,
      tags: r.tags, hostName: r.host.displayName,
    })),
    total, page, pageSize, hasMore: skip + pageSize < total,
  };
}

export async function generateInviteLink(roomId: string, inviterId: string): Promise<string> {
  const room = await getDb().room.findUnique({ where: { id: roomId } });
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');
  const token = jwt.sign({ roomId, code: room.code, inviterId }, config.JWT_SECRET, { expiresIn: '24h' });
  return token;
}

// ─── Helpers ──────────────────────────────────────────────────

async function getRoomSyncState(roomId: string): Promise<SyncState> {
  const cached = await getJson<SyncState>(REDIS_KEYS.roomState(roomId));
  return cached ?? createInitialSyncState();
}

async function cleanupRoomRedis(roomId: string) {
  const redis = getRedis();
  await redis.del(REDIS_KEYS.roomState(roomId), REDIS_KEYS.roomMembers(roomId));
  await redis.zrem(REDIS_KEYS.roomDiscovery, roomId);
}

function formatRoomResponse(room: any, settings: RoomSettings, syncState: SyncState) {
  return {
    id: room.id, code: room.code, name: room.name,
    isPublic: room.isPublic, hasPassword: !!room.passwordHash,
    hostId: room.hostId, maxMembers: room.maxMembers,
    memberCount: room.members?.length ?? 0,
    createdAt: room.createdAt?.toISOString?.() ?? room.createdAt,
    currentAnime: room.currentAnime, tags: room.tags ?? [],
    members: room.members?.map((m: any) => ({
      userId: m.userId, username: m.user.username,
      displayName: m.user.displayName, avatarUrl: m.user.avatarUrl,
      role: m.role, joinedAt: m.joinedAt?.toISOString?.() ?? m.joinedAt,
      presence: { isConnected: true, isBuffering: false, currentTime: 0, lastHeartbeat: Date.now() },
    })) ?? [],
    settings, syncState,
  };
}

export class RoomError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'RoomError';
  }
}
