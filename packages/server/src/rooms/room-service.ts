// ═══════════════════════════════════════════════════════════════
// Room Service — In-Memory Room Management (No Database)
// Simple room create/join/leave with code-based access
// ═══════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';
import { createInitialSyncState, type SyncState } from '@anisync/shared';
import type { RoomSettings } from '@anisync/shared';
import { setJson, getJson } from '../redis/client';
import { REDIS_KEYS, ROOM_CODE_CHARS } from '../config';

const DEFAULT_SETTINGS: RoomSettings = {
  syncMode: 'host-authority',
  allowGuestControl: false,
  bufferingPolicy: 'wait-threshold',
  driftThresholdMs: 500,
  maxMembers: 10,
  chatEnabled: true,
  slowMode: 0,
};

// ─── In-Memory Room Store ─────────────────────────────────────

interface RoomData {
  id: string;
  code: string;
  name: string;
  isPublic: boolean;
  passwordHash: string | null;
  hostId: string;
  maxMembers: number;
  settings: RoomSettings;
  members: Map<string, { username: string; role: string; joinedAt: string }>;
  createdAt: string;
  isActive: boolean;
}

const rooms = new Map<string, RoomData>();       // id -> room
const codeToId = new Map<string, string>();       // code -> id

// ─── Room Code Generator ──────────────────────────────────────

function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function uniqueRoomCode(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateRoomCode();
    if (!codeToId.has(code)) return code;
  }
  return generateRoomCode(8);
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Service Functions ────────────────────────────────────────

export async function createRoom(hostId: string, data: {
  name: string;
  isPublic: boolean;
  password?: string;
  maxMembers?: number;
  settings?: Partial<RoomSettings>;
}) {
  const code = uniqueRoomCode();
  const id = generateId();
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
  const settings = { ...DEFAULT_SETTINGS, ...data.settings };

  const room: RoomData = {
    id, code,
    name: data.name.trim().slice(0, 50),
    isPublic: data.isPublic,
    passwordHash, hostId,
    maxMembers: data.maxMembers ?? 10,
    settings,
    members: new Map([[hostId, { username: hostId, role: 'host', joinedAt: new Date().toISOString() }]]),
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  rooms.set(id, room);
  codeToId.set(code, id);

  // Initialize sync state
  const syncState = createInitialSyncState();
  await setJson(REDIS_KEYS.roomState(id), syncState);

  console.log(`[Room] Created: ${room.name} (${code}) by ${hostId}`);
  return formatRoomResponse(room, syncState);
}

export async function joinRoom(userId: string, code: string, password?: string) {
  const roomId = codeToId.get(code.toUpperCase());
  if (!roomId) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');

  const room = rooms.get(roomId);
  if (!room || !room.isActive) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');
  if (room.members.size >= room.maxMembers) throw new RoomError('ROOM_FULL', 'Oda dolu');

  // Already a member? Just return
  if (room.members.has(userId)) {
    const syncState = await getRoomSyncState(roomId);
    return { room: formatRoomResponse(room, syncState), syncState };
  }

  // Password check
  if (room.passwordHash) {
    if (!password) throw new RoomError('PASSWORD_REQUIRED', 'Bu oda şifreli');
    const valid = await bcrypt.compare(password, room.passwordHash);
    if (!valid) throw new RoomError('INVALID_PASSWORD', 'Yanlış şifre');
  }

  // Add member
  room.members.set(userId, { username: userId, role: 'viewer', joinedAt: new Date().toISOString() });

  const syncState = await getRoomSyncState(roomId);
  console.log(`[Room] ${userId} joined ${room.name} (${code})`);
  return { room: formatRoomResponse(room, syncState), syncState };
}

export async function leaveRoom(userId: string, roomId: string): Promise<{ roomClosed: boolean; newHostId?: string }> {
  const room = rooms.get(roomId);
  if (!room) return { roomClosed: false };

  room.members.delete(userId);

  if (room.members.size === 0) {
    // Close room
    room.isActive = false;
    rooms.delete(roomId);
    codeToId.delete(room.code);
    console.log(`[Room] Closed: ${room.name} (${room.code})`);
    return { roomClosed: true };
  }

  // Transfer host if needed
  if (room.hostId === userId) {
    const newHost = room.members.keys().next().value!;
    room.hostId = newHost;
    const member = room.members.get(newHost)!;
    member.role = 'host';
    console.log(`[Room] Host transferred to ${newHost} in ${room.name}`);
    return { roomClosed: false, newHostId: newHost };
  }

  return { roomClosed: false };
}

export function transferHost(roomId: string, currentHostId: string, newHostId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  const currentHost = room.members.get(currentHostId);
  if (!currentHost || currentHost.role !== 'host') return false;
  
  const newHost = room.members.get(newHostId);
  if (!newHost) return false;

  room.hostId = newHostId;
  currentHost.role = 'viewer';
  newHost.role = 'host';
  
  console.log(`[Room] Host transferred to ${newHostId} by ${currentHostId} in ${room.name}`);
  return true;
}

export async function kickMember(roomId: string, targetUserId: string, byUserId: string) {
  const room = rooms.get(roomId);
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');

  const kicker = room.members.get(byUserId);
  if (!kicker || (kicker.role !== 'host' && kicker.role !== 'moderator')) {
    throw new RoomError('FORBIDDEN', 'Yetkiniz yok');
  }

  const target = room.members.get(targetUserId);
  if (!target) throw new RoomError('NOT_MEMBER', 'Kullanıcı odada değil');
  if (target.role === 'host') throw new RoomError('CANNOT_KICK_HOST', 'Host atılamaz');

  room.members.delete(targetUserId);
}

export async function updateSettings(roomId: string, userId: string, updates: Partial<RoomSettings>) {
  const room = rooms.get(roomId);
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');

  const member = room.members.get(userId);
  if (!member || member.role !== 'host') throw new RoomError('FORBIDDEN', 'Sadece host ayarları değiştirebilir');

  room.settings = { ...room.settings, ...updates };
  return room.settings;
}

export async function discoverRooms(_page = 1, _pageSize = 20, _sort = 'trending') {
  const publicRooms = [...rooms.values()].filter(r => r.isPublic && r.isActive);
  return {
    rooms: publicRooms.map(r => ({
      id: r.id, code: r.code, name: r.name, isPublic: true,
      hasPassword: !!r.passwordHash, hostId: r.hostId,
      maxMembers: r.maxMembers, memberCount: r.members.size,
      createdAt: r.createdAt, currentAnime: null,
      tags: [], hostName: r.hostId,
    })),
    total: publicRooms.length, page: _page, hasMore: false,
  };
}

export async function generateInviteLink(roomId: string, _inviterId: string): Promise<string> {
  const room = rooms.get(roomId);
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Oda bulunamadı');
  return room.code; // Just return the room code
}

// ─── Helpers ──────────────────────────────────────────────────

async function getRoomSyncState(roomId: string): Promise<SyncState> {
  const cached = await getJson<SyncState>(REDIS_KEYS.roomState(roomId));
  return cached ?? createInitialSyncState();
}

function formatRoomResponse(room: RoomData, syncState: SyncState) {
  return {
    id: room.id, code: room.code, name: room.name,
    isPublic: room.isPublic, hasPassword: !!room.passwordHash,
    hostId: room.hostId, maxMembers: room.maxMembers,
    memberCount: room.members.size,
    createdAt: room.createdAt, currentAnime: null, tags: [],
    members: [...room.members.entries()].map(([userId, m]) => ({
      userId, username: m.username,
      displayName: m.username, avatarUrl: null,
      role: m.role, joinedAt: m.joinedAt,
      presence: { isConnected: true, isBuffering: false, currentTime: 0, lastHeartbeat: Date.now() },
    })),
    settings: room.settings, syncState,
  };
}

export class RoomError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'RoomError';
  }
}
