// ═══════════════════════════════════════════════════════════════
// Zustand Stores — Centralized State Management
// Auth, Room, Sync, Chat, UI stores
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type {
  RoomDetails, RoomMember, RoomSettings,
  SyncState, ChatMessage, TypingIndicator,
} from '@anisync/shared';

// ─── Auth Store ────────────────────────────────────────────────

interface UserInfo { username: string; displayName: string; }

interface AuthState {
  username: string;
  user: UserInfo | null;
  avatar: string;
  accessCode: string;
  isConnected: boolean;
  setUser: (username: string, displayName?: string) => void;
  setDisplayName: (displayName: string) => void;
  setAvatar: (avatar: string) => void;
  setAccessCode: (code: string) => void;
  setConnected: (connected: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  username: localStorage.getItem('anisync_username') || '',
  user: (() => {
    const u = localStorage.getItem('anisync_username');
    const d = localStorage.getItem('anisync_displayname');
    return u ? { username: u, displayName: d || u } : null;
  })(),
  avatar: localStorage.getItem('anisync_avatar') || '',
  accessCode: localStorage.getItem('anisync_access_code') || '',
  isConnected: false,
  setUser: (username, displayName) => {
    localStorage.setItem('anisync_username', username);
    const dn = displayName || username;
    localStorage.setItem('anisync_displayname', dn);
    set({ username, user: { username, displayName: dn } });
  },
  setDisplayName: (displayName) => {
    localStorage.setItem('anisync_displayname', displayName);
    set((s) => ({ user: s.user ? { ...s.user, displayName } : { username: s.username, displayName } }));
  },
  setAvatar: (avatar) => { localStorage.setItem('anisync_avatar', avatar); set({ avatar }); },
  setAccessCode: (code) => { localStorage.setItem('anisync_access_code', code); set({ accessCode: code }); },
  setConnected: (isConnected) => set({ isConnected }),
  logout: () => {
    localStorage.removeItem('anisync_username');
    localStorage.removeItem('anisync_displayname');
    set({ username: '', user: null, isConnected: false });
  },
}));

// ─── Room Store ───────────────────────────────────────────────

interface PendingJoinRequest {
  userId: string;
  username: string;
  avatar: string | null;
  roomId: string;
  timestamp: number;
}

interface RoomState {
  currentRoom: RoomDetails | null;
  members: RoomMember[];
  settings: RoomSettings | null;
  theme: string;
  isJoining: boolean;
  error: string | null;
  pendingJoinRequests: PendingJoinRequest[];
  setRoom: (room: RoomDetails) => void;
  updateMembers: (members: RoomMember[]) => void;
  addMember: (member: RoomMember) => void;
  removeMember: (userId: string) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  setTheme: (theme: string) => void;
  leaveRoom: () => void;
  setJoining: (joining: boolean) => void;
  setError: (error: string | null) => void;
  addPendingRequest: (req: PendingJoinRequest) => void;
  removePendingRequest: (userId: string) => void;
  clearPendingRequests: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  members: [],
  settings: null,
  theme: 'night',
  isJoining: false,
  error: null,
  pendingJoinRequests: [],
  setRoom: (room) => {
    // PERF: Start KeepAliveService when joining a room (Android only)
    try { (window as any).AniSyncBridge?.startKeepAlive(); } catch (_) {}
    set({
      currentRoom: room,
      members: room.members ?? [],
      settings: room.settings ?? null,
      theme: (room as any).theme || 'night',
      error: null,
    });
  },
  updateMembers: (members) => set({ members }),
  addMember: (member) => set({ members: [...get().members, member] }),
  removeMember: (userId) => set({
    members: get().members.filter(m => m.userId !== userId),
  }),
  updateSettings: (updates) => set({
    settings: { ...get().settings!, ...updates },
  }),
  setTheme: (theme) => set({ theme }),
  leaveRoom: () => {
    // PERF: Stop KeepAliveService when leaving a room (Android only)
    try { (window as any).AniSyncBridge?.stopKeepAlive(); } catch (_) {}
    set({
      currentRoom: null, members: [], settings: null, theme: 'night', error: null, pendingJoinRequests: [],
    });
  },
  setJoining: (isJoining) => set({ isJoining }),
  setError: (error) => set({ error }),
  addPendingRequest: (req) => set({
    pendingJoinRequests: [...get().pendingJoinRequests.filter(r => r.userId !== req.userId), req],
  }),
  removePendingRequest: (userId) => set({
    pendingJoinRequests: get().pendingJoinRequests.filter(r => r.userId !== userId),
  }),
  clearPendingRequests: () => set({ pendingJoinRequests: [] }),
}));

// ─── Sync Store ───────────────────────────────────────────────

interface SyncStoreState {
  syncState: SyncState | null;
  currentUrl: string | null;
  isPlayerReady: boolean;
  playerType: string | null;
  isSynced: boolean;
  lastDriftMs: number;
  setSyncState: (state: SyncState) => void;
  setCurrentUrl: (url: string | null) => void;
  setPlayerReady: (ready: boolean, type?: string) => void;
  setDrift: (driftMs: number) => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  syncState: null,
  currentUrl: null,
  isPlayerReady: false,
  playerType: null,
  isSynced: true,
  lastDriftMs: 0,
  setSyncState: (syncState) => set({ syncState }),
  setCurrentUrl: (currentUrl) => set({ currentUrl }),
  setPlayerReady: (isPlayerReady, playerType) => set({
    isPlayerReady,
    playerType: playerType ?? null,
  }),
  setDrift: (lastDriftMs) => set({
    lastDriftMs,
    isSynced: lastDriftMs < 500,
  }),
}));

// ─── Chat Store ───────────────────────────────────────────────

// Mobile detection for memory-conscious limits
const _isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const MAX_CHAT_MESSAGES = _isMobileDevice ? 100 : 200;

interface ChatState {
  messages: ChatMessage[];
  typingUsers: TypingIndicator[];
  unreadCount: number;
  isOpen: boolean;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  removeMessage: (messageId: string) => void;
  setTyping: (indicator: TypingIndicator) => void;
  clearTyping: (userId: string) => void;
  setOpen: (open: boolean) => void;
  resetUnread: () => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  typingUsers: [],
  unreadCount: 0,
  isOpen: true,
  addMessage: (message) => {
    const { messages, isOpen } = get();
    set({
      messages: [...messages.slice(-MAX_CHAT_MESSAGES), message],
      unreadCount: isOpen ? 0 : get().unreadCount + 1,
    });
  },
  setMessages: (messages) => set({ messages }),
  removeMessage: (messageId) => set({
    messages: get().messages.filter(m => m.id !== messageId),
  }),
  setTyping: (indicator) => {
    // Clean stale typing indicators (>10s old) to prevent phantom "typing..." states
    const now = Date.now();
    const current = get().typingUsers.filter(t =>
      t.userId !== indicator.userId && (!((t as any)._ts) || now - (t as any)._ts < 10000)
    );
    if (indicator.isTyping) current.push({ ...indicator, _ts: now } as any);
    set({ typingUsers: current });
  },
  clearTyping: (userId) => set({
    typingUsers: get().typingUsers.filter(t => t.userId !== userId),
  }),
  setOpen: (isOpen) => set({ isOpen, unreadCount: isOpen ? 0 : get().unreadCount }),
  resetUnread: () => set({ unreadCount: 0 }),
  clear: () => set({ messages: [], typingUsers: [], unreadCount: 0 }),
}));

// ─── UI Store ─────────────────────────────────────────────────

export type AppView = 'home' | 'login' | 'register' | 'lobby' | 'room' | 'profile' | 'friends' | 'discover' | 'access';

interface UIState {
  currentView: AppView;
  sidebarOpen: boolean;
  toasts: Toast[];
  theme: 'dark' | 'light';
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set, get) => {
  const initialTheme = (() => {
    try {
      const saved = localStorage.getItem('anisync_theme');
      if (saved === 'light' || saved === 'dark') return saved as 'light' | 'dark';
    } catch { }
    return 'light';
  })();
  document.documentElement.setAttribute('data-theme', initialTheme);

  return {
  currentView: 'home',
  sidebarOpen: true,
  toasts: [],
  theme: initialTheme,
  setView: (currentView) => set({ currentView }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    const newToast = { ...toast, id };
    set({ toasts: [...get().toasts, newToast] });
    setTimeout(() => get().removeToast(id), toast.duration ?? 4000);
  },
  removeToast: (id) => set({
    toasts: get().toasts.filter(t => t.id !== id),
  }),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('anisync_theme', theme);
    set({ theme });
  },
};
});
