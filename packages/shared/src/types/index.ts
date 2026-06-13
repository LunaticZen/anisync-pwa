// ═══════════════════════════════════════════════════════════════
// @anisync/shared — Core Type Definitions
// Production-grade types for the entire AniSync ecosystem
// ═══════════════════════════════════════════════════════════════

// ─── User Types ────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface UserProfile extends User {
  friendCount: number;
  watchCount: number;
  bio: string | null;
  badges: UserBadge[];
}

export interface UserBadge {
  id: string;
  name: string;
  icon: string;
  color: string;
  earnedAt: string;
}

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  roomId: string | null;
  currentAnime: string | null;
  lastHeartbeat: number;
}

export type PresenceStatus = 'online' | 'idle' | 'watching' | 'offline';

// ─── Auth Types ────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// ─── Room Types ────────────────────────────────────────────────

export interface Room {
  id: string;
  code: string;
  name: string;
  isPublic: boolean;
  hasPassword: boolean;
  hostId: string;
  maxMembers: number;
  memberCount: number;
  createdAt: string;
  currentAnime: AnimeInfo | null;
  tags: string[];
}

export interface RoomDetails extends Room {
  members: RoomMember[];
  settings: RoomSettings;
  syncState: SyncState;
}

export interface RoomMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: RoomRole;
  joinedAt: string;
  presence: MemberPresence;
}

export type RoomRole = 'host' | 'moderator' | 'viewer';

export interface MemberPresence {
  isConnected: boolean;
  isBuffering: boolean;
  currentTime: number;
  lastHeartbeat: number;
}

export interface RoomSettings {
  syncMode: SyncMode;
  allowGuestControl: boolean;
  bufferingPolicy: BufferingPolicy;
  driftThresholdMs: number;
  maxMembers: number;
  chatEnabled: boolean;
  slowMode: number; // seconds between messages, 0 = off
}

export type SyncMode = 'host-authority' | 'democratic';
export type BufferingPolicy = 'wait-all' | 'wait-threshold' | 'ignore';

export interface CreateRoomRequest {
  name: string;
  isPublic: boolean;
  password?: string;
  maxMembers?: number;
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomRequest {
  code: string;
  password?: string;
}

export interface RoomInvite {
  roomId: string;
  code: string;
  inviterId: string;
  token: string;
  expiresAt: string;
}

// ─── Anime & Video Types ──────────────────────────────────────

export interface AnimeInfo {
  title: string;
  episode: string;
  url: string;
  site: AnimeSite;
  thumbnailUrl?: string;
}

export type AnimeSite = 'turkanime' | 'tranimeizle' | 'generic' | 'unknown';

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  isActive: boolean;
}

export interface QualityLevel {
  id: string;
  label: string;
  height: number;
  isActive: boolean;
}

export type PlayerType = 'html5' | 'jwplayer' | 'iframe' | 'unknown';

export interface PlayerInfo {
  type: PlayerType;
  site: AnimeSite;
  hasSubtitles: boolean;
  hasQuality: boolean;
  duration: number;
}

// ─── Sync Types ────────────────────────────────────────────────

export interface SyncState {
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  generation: number;
  lastEventAt: number; // server timestamp
  activeSubtitle: string | null;
  activeQuality: string | null;
  anime: AnimeInfo | null;
}

export interface SyncEvent {
  type: SyncEventType;
  time: number;
  generation: number;
  originUserId: string;
  serverTimestamp?: number;
  metadata?: Record<string, unknown>;
}

export type SyncEventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'speed'
  | 'subtitle'
  | 'quality'
  | 'episode-change'
  | 'buffering'
  | 'ready'
  | 'heartbeat'
  | 'correction';

export interface DriftReport {
  userId: string;
  reportedTime: number;
  expectedTime: number;
  driftMs: number;
  timestamp: number;
}

export interface SyncCorrection {
  targetTime: number;
  isPlaying: boolean;
  speed: number;
  generation: number;
  reason: 'drift' | 'late-join' | 'reconnect' | 'host-override';
}

// ─── Chat Types ────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  text: string;
  type: MessageType;
  reactions: MessageReaction[];
  createdAt: string;
  editedAt: string | null;
  replyTo?: {
    id: string;
    username: string;
    text: string;
  };
}

export type MessageType = 'text' | 'system' | 'gif' | 'emoji';

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface SendMessageRequest {
  text: string;
  type?: MessageType;
  replyTo?: {
    id: string;
    username: string;
    text: string;
  };
}

export interface TypingIndicator {
  userId: string;
  username: string;
  isTyping: boolean;
}

// ─── Friend Types ──────────────────────────────────────────────

export interface Friendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendRequest {
  id: string;
  from: User;
  createdAt: string;
}

// ─── API Response Types ────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Notification Types ────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'friend-request'
  | 'room-invite'
  | 'room-started'
  | 'friend-online'
  | 'system';

// ─── Config Types ──────────────────────────────────────────────

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  syncMode: 'host-authority',
  allowGuestControl: false,
  bufferingPolicy: 'wait-threshold',
  driftThresholdMs: 500,
  maxMembers: 10,
  chatEnabled: true,
  slowMode: 0,
};

export const SYNC_CONSTANTS = {
  HEARTBEAT_INTERVAL_MS: 5000,
  DRIFT_CHECK_INTERVAL_MS: 10000,
  MAX_DRIFT_MS: 500,
  RECONNECT_GRACE_PERIOD_MS: 30000,
  MAX_GENERATION_GAP: 100,
  NTP_SAMPLE_COUNT: 5,
  SEEK_THRESHOLD_MS: 1000,
  BUFFERING_TIMEOUT_MS: 15000,
} as const;

export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 60,
  CHAT_MESSAGES_PER_MINUTE: 30,
  SYNC_EVENTS_PER_SECOND: 10,
  ROOM_CREATES_PER_HOUR: 5,
  LOGIN_ATTEMPTS_PER_MINUTE: 5,
} as const;

export const ROOM_CODE_LENGTH = 6;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_ROOM_NAME_LENGTH = 50;
export const MAX_USERNAME_LENGTH = 20;
export const MIN_PASSWORD_LENGTH = 8;
