// ═══════════════════════════════════════════════════════════════
// Socket.IO Client Service — WebSocket Connection Manager
// No-auth mode: connects with just a username
// ═══════════════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@anisync/shared';
import { useAuthStore, useRoomStore, useSyncStore, useChatStore, useUIStore } from '../stores';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

const DEFAULT_SERVER = 'https://anisync-server.onrender.com';

// Server URL: stored in localStorage, configurable from UI
export function getServerUrl(): string {
  if (typeof window !== 'undefined') {
    // Mobile WebView: use the server that served this page
    if (window.location.pathname.startsWith('/app')) {
      return window.location.origin;
    }
    // Check localStorage for saved Render URL
    const saved = localStorage.getItem('anisync_server_url');
    if (saved) return saved;
  }
  return DEFAULT_SERVER;
}

export function setServerUrl(url: string) {
  localStorage.setItem('anisync_server_url', url.replace(/\/+$/, ''));
}

export function getSocket(): TypedSocket | null {
  return socket;
}

// ── Cold Start Warm-Up ──
// Render.com free tier may sleep after 15min inactivity.
// We ping /api/health first to wake it up before connecting socket.
export async function warmUpServer(): Promise<boolean> {
  const url = getServerUrl() + '/api/health';
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return true;
    } catch {
      // Server still waking up, wait and retry
      if (attempt < 6) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  return false;
}

export function connectSocket(username: string): TypedSocket {
  // Clean up old socket before creating new one
  if (socket) {
    socket.removeAllListeners();
    if (socket.connected) socket.disconnect();
    socket = null;
  }

  const avatar = useAuthStore.getState().avatar || null;
  const accessCode = useAuthStore.getState().accessCode || '';

  socket = io(getServerUrl(), {
    auth: { username, avatar, accessCode },
    forceNew: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 20,
    timeout: 25000,
    transports: ['websocket', 'polling'],
  }) as any;

  // ── Connection Events ──
  socket.on('connect', () => {
    console.log('[WS] Connected');
    useAuthStore.getState().setConnected(true);
    performClockSync();

    // ── Auto-rejoin room on reconnect ──
    const currentRoom = useRoomStore.getState().currentRoom;
    if (currentRoom) {
      console.log('[WS] Reconnecting to room:', currentRoom.name);
      socket!.emit('room:rejoin', { roomId: currentRoom.id }, (res: any) => {
        if (res.success) {
          console.log('[WS] Rejoined room successfully');
          useRoomStore.getState().setRoom(res.room);
          if (res.currentUrl) {
            useSyncStore.getState().setCurrentUrl(res.currentUrl);
          }
          if (res.syncState) {
            useSyncStore.getState().setSyncState(res.syncState);
          }
        } else {
          console.log('[WS] Rejoin failed, room may be closed');
          useRoomStore.getState().leaveRoom();
          useChatStore.getState().clear();
          useSyncStore.getState().setCurrentUrl(null);
          // Close anime on native side
          if ((window as any).AniSyncBridge?.closeAnime) (window as any).AniSyncBridge.closeAnime();
          if ((window as any).anisync?.anime?.close) (window as any).anisync.anime.close();
          useUIStore.getState().setView('home');
          useUIStore.getState().addToast({ type: 'info', title: 'Oda kapandı', message: 'Bağlantı koptuğunda oda kapanmış' });
        }
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
    useAuthStore.getState().setConnected(false);
    if (reason !== 'io client disconnect') {
      useUIStore.getState().addToast({ type: 'warning', title: 'Bağlantı koptu', message: 'Yeniden bağlanılıyor...' });
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[WS] Connection error:', err.message);
    if (err.message === 'INVALID_ACCESS_CODE') {
      useAuthStore.getState().setAccessCode('');
      useAuthStore.getState().setConnected(false);
      useUIStore.getState().setView('access');
      useUIStore.getState().addToast({ type: 'error', title: 'Erişim Reddedildi', message: 'Geçersiz davetiye kodu' });
      // Stop reconnection attempts for invalid code
      socket?.disconnect();
    }
  });

  // ── Room Events ──
  socket.on('room:member-joined', (data) => {
    useRoomStore.getState().addMember(data.member);
    useChatStore.getState().addMessage({
      id: `sys-${Date.now()}`, roomId: '', userId: 'system', username: 'system',
      displayName: 'Sistem', avatarUrl: null, text: `${data.member.displayName} katıldı`,
      type: 'system', reactions: [], createdAt: new Date().toISOString(), editedAt: null,
    });
  });

  socket.on('room:member-left', (data) => {
    useRoomStore.getState().removeMember(data.userId);
  });

  // Handle reconnected user (was temporarily disconnected)
  (socket as any).on('room:member-reconnected', (data: any) => {
    const room = useRoomStore.getState().currentRoom;
    if (room) {
      // Update member's presence to connected
      const updatedMembers = room.members.map((m: any) =>
        m.userId === data.userId
          ? { ...m, avatar: data.avatar || m.avatar, presence: { ...m.presence, isConnected: true, lastHeartbeat: Date.now() } }
          : m
      );
      useRoomStore.getState().setRoom({ ...room, members: updatedMembers });
    }
  });

  // Handle presence updates (online/offline status)
  (socket as any).on('presence:room-update', (data: any) => {
    const room = useRoomStore.getState().currentRoom;
    if (room) {
      const updatedMembers = room.members.map((m: any) =>
        m.userId === data.userId
          ? { ...m, presence: { ...m.presence, ...data.presence } }
          : m
      );
      useRoomStore.getState().setRoom({ ...room, members: updatedMembers });
    }
  });

  socket.on('room:member-kicked', (data) => {
    const myName = useAuthStore.getState().username;
    if (data.userId === myName) {
      useRoomStore.getState().leaveRoom();
      useChatStore.getState().clear();
      useSyncStore.getState().setCurrentUrl(null);
      // Close anime on native side
      if ((window as any).AniSyncBridge?.closeAnime) (window as any).AniSyncBridge.closeAnime();
      if ((window as any).anisync?.anime?.close) (window as any).anisync.anime.close();
      useUIStore.getState().setView('home');
      useUIStore.getState().addToast({ type: 'error', title: 'Odadan atıldınız' });
    } else {
      useRoomStore.getState().removeMember(data.userId);
    }
  });

  socket.on('room:closed', (data) => {
    useRoomStore.getState().leaveRoom();
    useChatStore.getState().clear();
    useSyncStore.getState().setCurrentUrl(null);
    // Close anime on native side
    if ((window as any).AniSyncBridge?.closeAnime) (window as any).AniSyncBridge.closeAnime();
    if ((window as any).anisync?.anime?.close) (window as any).anisync.anime.close();
    useUIStore.getState().setView('home');
    useUIStore.getState().addToast({ type: 'info', title: 'Oda kapandı', message: data.reason });
  });

  socket.on('room:host-transferred', (data) => {
    const room = useRoomStore.getState().currentRoom;
    if (room) {
      useRoomStore.getState().setRoom({ ...room, hostId: data.newHostId });
    }
  });

  socket.on('room:settings-changed', (data) => {
    useRoomStore.getState().updateSettings(data.settings);
  });

  // ── Sync Events ──
  socket.on('sync:play', (data) => useSyncStore.getState().setSyncState({
    ...useSyncStore.getState().syncState!,
    isPlaying: true, currentTime: data.time, generation: data.generation, lastEventAt: data.serverTimestamp,
  }));

  socket.on('sync:pause', (data) => useSyncStore.getState().setSyncState({
    ...useSyncStore.getState().syncState!,
    isPlaying: false, currentTime: data.time, generation: data.generation, lastEventAt: data.serverTimestamp,
  }));

  socket.on('sync:seek', (data) => useSyncStore.getState().setSyncState({
    ...useSyncStore.getState().syncState!,
    currentTime: data.time, generation: data.generation, lastEventAt: data.serverTimestamp,
  }));

  socket.on('sync:state-update', (data) => useSyncStore.getState().setSyncState(data));

  socket.on('sync:correction', (data) => {
    useSyncStore.getState().setSyncState({
      ...useSyncStore.getState().syncState!,
      isPlaying: data.isPlaying, currentTime: data.targetTime,
      playbackSpeed: data.speed, generation: data.generation,
    });
  });

  // ── URL Sync ──
  socket.on('sync:url-changed', (data) => {
    console.log('[Sync] URL changed:', data.url);
    useSyncStore.getState().setCurrentUrl(data.url);
  });

  // ── Avatar live update ──
  (socket as any).on('user:avatar-changed', (data: any) => {
    const room = useRoomStore.getState().currentRoom;
    if (room) {
      const members = room.members.map((m: any) =>
        m.userId === data.userId ? { ...m, avatar: data.avatar } : m
      );
      useRoomStore.getState().setRoom({ ...room, members });
    }
  });

  // ── Chat Events ──
  socket.on('chat:message', (data) => useChatStore.getState().addMessage(data));
  socket.on('chat:system', (data) => useChatStore.getState().addMessage({
    id: `sys-${Date.now()}`, roomId: '', userId: 'system', username: 'system',
    displayName: 'Sistem', avatarUrl: null, text: data.text,
    type: 'system', reactions: [], createdAt: new Date().toISOString(), editedAt: null,
  }));
  socket.on('chat:typing', (data) => useChatStore.getState().setTyping(data));
  socket.on('chat:deleted', (data) => useChatStore.getState().removeMessage(data.messageId));

  // ── Join Approval Events ──
  (socket as any).on('room:join-request', (data: any) => {
    useRoomStore.getState().addPendingRequest({
      userId: data.userId, username: data.username, avatar: data.avatar || null,
      roomId: data.roomId, timestamp: data.timestamp,
    });
    useUIStore.getState().addToast({ type: 'info', title: 'Katılma isteği', message: `${data.username} odaya katılmak istiyor` });
  });
  (socket as any).on('room:request-cancelled', (data: any) => {
    useRoomStore.getState().removePendingRequest(data.userId);
  });
  (socket as any).on('room:join-approved', (data: any) => {
    useRoomStore.getState().setRoom(data.room);
    if (data.syncState) useSyncStore.getState().setSyncState(data.syncState);
    if (data.currentUrl) useSyncStore.getState().setCurrentUrl(data.currentUrl);
    useUIStore.getState().setView('room');
    useUIStore.getState().addToast({ type: 'success', title: 'Onaylandı!', message: 'Odaya katıldın' });
  });
  (socket as any).on('room:join-rejected', (data: any) => {
    useUIStore.getState().addToast({ type: 'error', title: 'Reddedildi', message: data.reason || 'Katılma isteği reddedildi' });
  });

  // ── Error ──
  socket.on('error', (data) => {
    useUIStore.getState().addToast({ type: 'error', title: 'Hata', message: data.message });
  });

  // ── Room Theme ──
  (socket as any).on('room:theme-changed', (data: any) => {
    useRoomStore.getState().setTheme(data.themeId);
  });

  // ── Force Leave: called by Android native on app close ──
  (window as any).__anisyncForceLeave = () => {
    const room = useRoomStore.getState().currentRoom;
    if (room && socket?.connected) {
      console.log('[WS] Force leaving room on app close:', room.name);
      socket.emit('room:leave', { roomId: room.id });
    }
    if (socket?.connected) {
      socket.disconnect();
    }
  };

  // ── Page unload: emit leave before page closes ──
  const onPageHide = () => {
    const room = useRoomStore.getState().currentRoom;
    if (room && socket?.connected) {
      console.log('[WS] Page hide — force leaving room');
      socket.emit('room:leave', { roomId: room.id });
      socket.disconnect();
    }
  };
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('beforeunload', onPageHide);

  return socket;
}

export function disconnectSocket(): void {
  // Also force leave room before disconnecting
  const room = useRoomStore.getState().currentRoom;
  if (room && socket?.connected) {
    socket.emit('room:leave', { roomId: room.id });
  }
  socket?.disconnect();
  socket = null;
}

// ── NTP Clock Sync ──
let clockOffset = 0;
export function getClockOffset(): number { return clockOffset; }

function performClockSync() {
  if (!socket) return;
  const offsets: number[] = [];
  let samples = 0;

  const doPing = () => {
    if (samples >= 5 || !socket?.connected) return;
    const sendTime = Date.now();
    socket.emit('time:ping', { clientSendTime: sendTime }, (res) => {
      const receiveTime = Date.now();
      const rtt = receiveTime - sendTime;
      const offset = res.serverTime - (sendTime + rtt / 2);
      offsets.push(offset);
      samples++;
      if (samples >= 5) {
        offsets.sort((a, b) => a - b);
        clockOffset = offsets[Math.floor(offsets.length / 2)];
      } else {
        setTimeout(doPing, 200);
      }
    });
  };
  doPing();
}
