// ═══════════════════════════════════════════════════════════════
// Zustand Stores — Centralized State Management
// Auth, Room, Sync, Chat, UI stores
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type {
  User, AuthTokens, RoomDetails, RoomMember, RoomSettings,
  SyncState, ChatMessage, TypingIndicator, PresenceStatus,
} from '@anisync/shared';

// ─── Auth Store ───────────────────────────────────────────────

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, tokens: AuthTokens) => void;
  updateTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  setAuth: (user, tokens) => {
    localStorage.setItem('anisync_tokens', JSON.stringify(tokens));
    set({ user, tokens, isAuthenticated: true, error: null });
  },
  updateTokens: (tokens) => {
    localStorage.setItem('anisync_tokens', JSON.stringify(tokens));
    set({ tokens });
  },
  logout: () => {
    localStorage.removeItem('anisync_tokens');
    set({ user: null, tokens: null, isAuthenticated: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ─── Room Store ───────────────────────────────────────────────

interface RoomState {
  currentRoom: RoomDetails | null;
  members: RoomMember[];
  settings: RoomSettings | null;
  isJoining: boolean;
  error: string | null;
  setRoom: (room: RoomDetails) => void;
  updateMembers: (members: RoomMember[]) => void;
  addMember: (member: RoomMember) => void;
  removeMember: (userId: string) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  leaveRoom: () => void;
  setJoining: (joining: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  members: [],
  settings: null,
  isJoining: false,
  error: null,
  setRoom: (room) => set({
    currentRoom: room,
    members: room.members ?? [],
    settings: room.settings ?? null,
    error: null,
  }),
  updateMembers: (members) => set({ members }),
  addMember: (member) => set({ members: [...get().members, member] }),
  removeMember: (userId) => set({
    members: get().members.filter(m => m.userId !== userId),
  }),
  updateSettings: (updates) => set({
    settings: { ...get().settings!, ...updates },
  }),
  leaveRoom: () => set({
    currentRoom: null, members: [], settings: null, error: null,
  }),
  setJoining: (isJoining) => set({ isJoining }),
  setError: (error) => set({ error }),
}));

// ─── Sync Store ───────────────────────────────────────────────

interface SyncStoreState {
  syncState: SyncState | null;
  isPlayerReady: boolean;
  playerType: string | null;
  isSynced: boolean;
  lastDriftMs: number;
  setSyncState: (state: SyncState) => void;
  setPlayerReady: (ready: boolean, type?: string) => void;
  setDrift: (driftMs: number) => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  syncState: null,
  isPlayerReady: false,
  playerType: null,
  isSynced: true,
  lastDriftMs: 0,
  setSyncState: (syncState) => set({ syncState }),
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
      messages: [...messages.slice(-200), message], // Keep last 200
      unreadCount: isOpen ? 0 : get().unreadCount + 1,
    });
  },
  setMessages: (messages) => set({ messages }),
  removeMessage: (messageId) => set({
    messages: get().messages.filter(m => m.id !== messageId),
  }),
  setTyping: (indicator) => {
    const current = get().typingUsers.filter(t => t.userId !== indicator.userId);
    if (indicator.isTyping) current.push(indicator);
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

export type AppView = 'login' | 'register' | 'lobby' | 'room' | 'profile' | 'friends' | 'discover';

interface UIState {
  currentView: AppView;
  sidebarOpen: boolean;
  toasts: Toast[];
  theme: 'dark' | 'light';
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  currentView: 'login',
  sidebarOpen: true,
  toasts: [],
  theme: 'dark',
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
}));
