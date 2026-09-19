// ═══════════════════════════════════════════════════════════════
// @anisync/shared — WebSocket Protocol Event Definitions
// Bidirectional event contract between client and server
// ═══════════════════════════════════════════════════════════════

import type {
  Room,
  RoomDetails,
  RoomMember,
  RoomSettings,
  SyncState,
  SyncCorrection,
  ChatMessage,
  SendMessageRequest,
  TypingIndicator,
  UserPresence,
  AnimeInfo,
  CreateRoomRequest,
  JoinRoomRequest,
} from '../types';

// ─── Client → Server Events ───────────────────────────────────

export interface ClientToServerEvents {
  // ── Room Events ──
  'room:create': (data: CreateRoomRequest, callback: (res: RoomResponse) => void) => void;
  'room:join': (data: JoinRoomRequest, callback: (res: RoomJoinResponse) => void) => void;
  'room:leave': (data: { roomId: string }) => void;
  'room:kick': (data: { roomId: string; targetUserId: string }) => void;
  'room:promote': (data: { roomId: string; targetUserId: string; role: string }) => void;
  'room:settings': (data: { roomId: string; settings: Partial<RoomSettings> }) => void;
  'room:set-theme': (data: { roomId: string; themeId: string }) => void;
  'room:transfer-host': (data: { roomId: string; targetUserId: string }) => void;

  // ── Sync Events ──
  'sync:play': (data: SyncPayload) => void;
  'sync:pause': (data: SyncPayload) => void;
  'sync:seek': (data: SyncPayload) => void;
  'sync:speed': (data: SyncPayload & { speed: number }) => void;
  'sync:subtitle': (data: { roomId: string; trackId: string }) => void;
  'sync:quality': (data: { roomId: string; qualityId: string }) => void;
  'sync:episode-change': (data: { roomId: string; anime: AnimeInfo }) => void;
  'sync:buffering': (data: { roomId: string; isBuffering: boolean }) => void;
  'sync:heartbeat': (data: SyncHeartbeat) => void;
  'sync:request-state': (data: { roomId: string }, callback: (state: SyncState) => void) => void;
  'sync:url-changed': (data: { roomId: string; url: string }) => void;
  'sync:timecheck': (data: { roomId: string; time: number; playing: boolean; userId: string }) => void;

  // ── Chat Events ──
  'chat:message': (data: { roomId: string } & SendMessageRequest) => void;
  'chat:typing': (data: { roomId: string; isTyping: boolean }) => void;
  'chat:reaction': (data: { roomId: string; messageId: string; emoji: string }) => void;
  'chat:delete': (data: { roomId: string; messageId: string }) => void;
  'chat:edit': (data: { roomId: string; messageId: string; text: string }) => void;

  // ── Presence Events ──
  'presence:heartbeat': () => void;
  'presence:update': (data: { status: string }) => void;

  // ── NTP Clock Sync ──
  'time:ping': (data: { clientSendTime: number }, callback: (res: TimePongResponse) => void) => void;

  // ── Discovery ──
  'rooms:discover': (data: DiscoverQuery, callback: (res: DiscoverResponse) => void) => void;
}

// ─── Server → Client Events ───────────────────────────────────

export interface ServerToClientEvents {
  // ── Room Events ──
  'room:member-joined': (data: { member: RoomMember }) => void;
  'room:member-left': (data: { userId: string; reason: LeaveReason }) => void;
  'room:member-kicked': (data: { userId: string; by: string }) => void;
  'room:member-promoted': (data: { userId: string; role: string }) => void;
  'room:settings-changed': (data: { settings: Partial<RoomSettings>; by: string }) => void;
  'room:theme-changed': (data: { theme: string; by: string }) => void;
  'room:host-transferred': (data: { newHostId: string }) => void;
  'room:closed': (data: { reason: string }) => void;

  // ── Sync Events ──
  'sync:state-update': (data: SyncState) => void;
  'sync:play': (data: ServerSyncEvent) => void;
  'sync:pause': (data: ServerSyncEvent) => void;
  'sync:seek': (data: ServerSyncEvent) => void;
  'sync:speed': (data: ServerSyncEvent & { speed: number }) => void;
  'sync:subtitle': (data: { trackId: string; generation: number }) => void;
  'sync:quality': (data: { qualityId: string; generation: number }) => void;
  'sync:episode-change': (data: { anime: AnimeInfo; generation: number }) => void;
  'sync:correction': (data: SyncCorrection) => void;
  'sync:buffering-update': (data: { userId: string; isBuffering: boolean }) => void;
  'sync:wait-for-buffer': (data: { bufferingUsers: string[] }) => void;
  'sync:url-changed': (data: { url: string; originUserId: string; serverTimestamp: number }) => void;
  'sync:timecheck': (data: { time: number; playing: boolean; userId: string; serverTimestamp: number }) => void;

  // ── Chat Events ──
  'chat:message': (data: ChatMessage) => void;
  'chat:typing': (data: TypingIndicator) => void;
  'chat:reaction': (data: { messageId: string; emoji: string; userId: string }) => void;
  'chat:deleted': (data: { messageId: string }) => void;
  'chat:edited': (data: { messageId: string; text: string; editedAt: string }) => void;
  'chat:system': (data: { text: string }) => void;

  // ── Presence Events ──
  'presence:update': (data: UserPresence) => void;
  'presence:room-update': (data: { userId: string; presence: import('../types').MemberPresence }) => void;

  // ── Notifications ──
  'notification:room-invite': (data: { roomCode: string; inviterName: string; roomName: string }) => void;
  'notification:friend-request': (data: { fromUserId: string; fromUsername: string }) => void;

  // ── Errors ──
  'error': (data: { code: string; message: string }) => void;
}

// ─── Shared Event Data Types ──────────────────────────────────

export interface SyncPayload {
  roomId: string;
  time: number;
  generation: number;
}

export interface ServerSyncEvent {
  time: number;
  generation: number;
  originUserId: string;
  serverTimestamp: number;
}

export interface SyncHeartbeat {
  roomId: string;
  currentTime: number;
  isPlaying: boolean;
  isBuffering: boolean;
  playbackSpeed: number;
}

export interface TimePongResponse {
  clientSendTime: number;
  serverTime: number;
  serverSendTime: number;
}

export type LeaveReason = 'voluntary' | 'kicked' | 'disconnected' | 'timeout';

// ─── Room Responses ───────────────────────────────────────────

export interface RoomResponse {
  success: boolean;
  room?: RoomDetails;
  error?: string;
}

export interface RoomJoinResponse {
  success: boolean;
  room?: RoomDetails;
  syncState?: SyncState;
  error?: string;
}

// ─── Discovery ────────────────────────────────────────────────

export interface DiscoverQuery {
  page?: number;
  pageSize?: number;
  sort?: 'trending' | 'newest' | 'members';
  anime?: string;
  site?: string;
}

export interface DiscoverResponse {
  rooms: Room[];
  total: number;
  page: number;
  hasMore: boolean;
}

// ─── Socket.IO Type Helper ────────────────────────────────────

export interface InterServerEvents {
  'room:sync': (data: { roomId: string; state: SyncState }) => void;
  'presence:sync': (data: { userId: string; presence: UserPresence }) => void;
}

export interface SocketData {
  userId: string;
  username: string;
  roomId?: string;
}
