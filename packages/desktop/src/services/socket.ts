// ═══════════════════════════════════════════════════════════════
// Socket.IO Client Service — WebSocket Connection Manager
// ═══════════════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@anisync/shared';
import { useAuthStore, useRoomStore, useSyncStore, useChatStore, useUIStore } from '../stores';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;
const SERVER_URL = 'http://localhost:3000';

export function getSocket(): TypedSocket | null {
  return socket;
}

export function connectSocket(): TypedSocket {
  const tokens = useAuthStore.getState().tokens;
  if (!tokens) throw new Error('Not authenticated');

  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    auth: { token: tokens.accessToken },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 20,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  });

  // ── Connection Events ──
  socket.on('connect', () => {
    console.log('[WS] Connected');
    useUIStore.getState().addToast({ type: 'success', title: 'Bağlandı', duration: 2000 });
    performClockSync();
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
    if (reason !== 'io client disconnect') {
      useUIStore.getState().addToast({ type: 'warning', title: 'Bağlantı koptu', message: 'Yeniden bağlanılıyor...' });
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[WS] Connection error:', err.message);
    if (err.message === 'AUTH_FAILED' || err.message === 'AUTH_REQUIRED') {
      useAuthStore.getState().logout();
      useUIStore.getState().setView('login');
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

  socket.on('room:member-kicked', (data) => {
    const myId = useAuthStore.getState().user?.id;
    if (data.userId === myId) {
      useRoomStore.getState().leaveRoom();
      useChatStore.getState().clear();
      useUIStore.getState().setView('lobby');
      useUIStore.getState().addToast({ type: 'error', title: 'Odadan atıldınız' });
    } else {
      useRoomStore.getState().removeMember(data.userId);
    }
  });

  socket.on('room:closed', (data) => {
    useRoomStore.getState().leaveRoom();
    useChatStore.getState().clear();
    useUIStore.getState().setView('lobby');
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

  // ── Chat Events ──
  socket.on('chat:message', (data) => useChatStore.getState().addMessage(data));
  socket.on('chat:system', (data) => useChatStore.getState().addMessage({
    id: `sys-${Date.now()}`, roomId: '', userId: 'system', username: 'system',
    displayName: 'Sistem', avatarUrl: null, text: data.text,
    type: 'system', reactions: [], createdAt: new Date().toISOString(), editedAt: null,
  }));
  socket.on('chat:typing', (data) => useChatStore.getState().setTyping(data));
  socket.on('chat:deleted', (data) => useChatStore.getState().removeMessage(data.messageId));

  // ── Error ──
  socket.on('error', (data) => {
    useUIStore.getState().addToast({ type: 'error', title: 'Hata', message: data.message });
  });

  return socket;
}

export function disconnectSocket(): void {
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
        clockOffset = offsets[Math.floor(offsets.length / 2)]; // median
      } else {
        setTimeout(doPing, 200);
      }
    });
  };
  doPing();
}
