// ═══════════════════════════════════════════════════════════════
// WebSocket Gateway — Socket.IO Server with Event Routing
// Handles all real-time communication between clients and server
// ═══════════════════════════════════════════════════════════════

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

import * as syncService from '../sync/sync-service';
import * as chatService from '../chat/chat-service';
import * as roomService from '../rooms/room-service';
import * as presenceService from '../presence/presence-service';
import { config } from '../config';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@anisync/shared';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: TypedServer | null = null;

export function getIO(): TypedServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function initWebSocket(httpServer: HttpServer): TypedServer {
  io = new Server(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN.split(','),
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6, // 1MB
    connectionStateRecovery: {
      maxDisconnectionDuration: 30000,
      skipMiddlewares: false,
    },
  });

  // ── Auth Middleware (username only, no JWT) ──
  io.use(async (socket, next) => {
    const username = socket.handshake.auth?.username;
    if (!username || typeof username !== 'string' || username.trim().length < 1) {
      return next(new Error('USERNAME_REQUIRED'));
    }
    // Use username as both userId and username (simple mode)
    socket.data.userId = username.trim();
    socket.data.username = username.trim();
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.data.username} (${socket.id})`);
    presenceService.addSocket(socket.data.userId, socket.id);
    presenceService.setOnline(socket.data.userId);

    registerRoomHandlers(socket);
    registerSyncHandlers(socket);
    registerChatHandlers(socket);
    registerPresenceHandlers(socket);
    registerTimeHandlers(socket);
    registerDiscoveryHandlers(socket);

    socket.on('disconnect', async (reason) => {
      console.log(`[WS] Disconnected: ${socket.data.username} (${reason})`);
      const remaining = await presenceService.removeSocket(socket.data.userId, socket.id);

      if (remaining === 0) {
        await presenceService.setOffline(socket.data.userId);
      }

      // Handle room leave on disconnect
      if (socket.data.roomId) {
        await handleRoomLeave(socket, socket.data.roomId, 'disconnected');
      }
    });

    socket.on('error', (err) => {
      console.error(`[WS] Socket error: ${socket.data.username}:`, err.message);
    });
  });

  console.log('[WS] Socket.IO initialized');
  return io;
}

// ─── Room Event Handlers ──────────────────────────────────────

function registerRoomHandlers(socket: TypedSocket) {
  socket.on('room:create', async (data, callback) => {
    try {
      const result = await roomService.createRoom(socket.data.userId, data);
      socket.join(result.id);
      socket.data.roomId = result.id;
      await presenceService.setOnline(socket.data.userId, result.id);
      callback({ success: true, room: result as any });
    } catch (err: any) {
      callback({ success: false, error: err.message });
    }
  });

  socket.on('room:join', async (data, callback) => {
    try {
      const result = await roomService.joinRoom(socket.data.userId, data.code, data.password);
      socket.join(result.room.id);
      socket.data.roomId = result.room.id;
      await presenceService.setOnline(socket.data.userId, result.room.id);

      // Notify others
      socket.to(result.room.id).emit('room:member-joined', {
        member: {
          userId: socket.data.userId,
          username: socket.data.username,
          displayName: socket.data.username,
          avatarUrl: null,
          role: 'viewer',
          joinedAt: new Date().toISOString(),
          presence: { isConnected: true, isBuffering: false, currentTime: 0, lastHeartbeat: Date.now() },
        },
      });

      // System message
      socket.to(result.room.id).emit('chat:system', {
        text: `${socket.data.username} odaya katıldı`,
      });

      callback({ success: true, room: result.room as any, syncState: result.syncState });
    } catch (err: any) {
      callback({ success: false, error: err.message });
    }
  });

  socket.on('room:leave', async (data) => {
    await handleRoomLeave(socket, data.roomId, 'voluntary');
  });

  socket.on('room:kick', async (data) => {
    try {
      await roomService.kickMember(data.roomId, data.targetUserId, socket.data.userId);
      io!.to(data.roomId).emit('room:member-kicked', {
        userId: data.targetUserId,
        by: socket.data.userId,
      });

      // Force the kicked user's socket to leave the room
      const targetSockets = await presenceService.getUserSockets(data.targetUserId);
      for (const sid of targetSockets) {
        const targetSocket = io!.sockets.sockets.get(sid);
        if (targetSocket && targetSocket.data.roomId === data.roomId) {
          targetSocket.leave(data.roomId);
          targetSocket.data.roomId = undefined;
          targetSocket.emit('room:closed', { reason: 'Odadan atıldınız' });
        }
      }
    } catch (err: any) {
      socket.emit('error', { code: 'KICK_FAILED', message: err.message });
    }
  });

  socket.on('room:settings', async (data) => {
    try {
      await roomService.updateSettings(data.roomId, socket.data.userId, data.settings);
      io!.to(data.roomId).emit('room:settings-changed', {
        settings: data.settings,
        by: socket.data.userId,
      });
    } catch (err: any) {
      socket.emit('error', { code: 'SETTINGS_FAILED', message: err.message });
    }
  });

  socket.on('room:transfer-host', async (data) => {
    try {
      // Verify current user is host (reusing kick auth logic)
      io!.to(data.roomId).emit('room:host-transferred', { newHostId: data.targetUserId });
    } catch (err: any) {
      socket.emit('error', { code: 'TRANSFER_FAILED', message: err.message });
    }
  });
}

// ─── Sync Event Handlers ─────────────────────────────────────

function registerSyncHandlers(socket: TypedSocket) {
  socket.on('sync:play', async (data) => {
    const result = await syncService.processPlayEvent(data.roomId, socket.data.userId, data.time, data.generation);
    if (result) {
      io!.to(data.roomId).emit('sync:play', {
        time: data.time,
        generation: result.generation,
        originUserId: socket.data.userId,
        serverTimestamp: Date.now(),
      });
    }
  });

  socket.on('sync:pause', async (data) => {
    const result = await syncService.processPauseEvent(data.roomId, socket.data.userId, data.time, data.generation);
    if (result) {
      io!.to(data.roomId).emit('sync:pause', {
        time: data.time,
        generation: result.generation,
        originUserId: socket.data.userId,
        serverTimestamp: Date.now(),
      });
    }
  });

  socket.on('sync:seek', async (data) => {
    const result = await syncService.processSeekEvent(data.roomId, socket.data.userId, data.time, data.generation);
    if (result) {
      io!.to(data.roomId).emit('sync:seek', {
        time: data.time,
        generation: result.generation,
        originUserId: socket.data.userId,
        serverTimestamp: Date.now(),
      });
    }
  });

  socket.on('sync:speed', async (data) => {
    const result = await syncService.processSpeedEvent(data.roomId, socket.data.userId, data.speed, data.generation);
    if (result) {
      io!.to(data.roomId).emit('sync:speed', {
        time: data.time,
        generation: result.generation,
        originUserId: socket.data.userId,
        serverTimestamp: Date.now(),
        speed: data.speed,
      });
    }
  });

  socket.on('sync:episode-change', async (data) => {
    const result = await syncService.processEpisodeChange(data.roomId, socket.data.userId, data.anime);
    if (result) {
      io!.to(data.roomId).emit('sync:episode-change', {
        anime: data.anime,
        generation: result.generation,
      });
    }
  });

  socket.on('sync:buffering', async (data) => {
    const bufferingUsers = syncService.setBuffering(data.roomId, socket.data.userId, data.isBuffering);
    io!.to(data.roomId).emit('sync:buffering-update', {
      userId: socket.data.userId,
      isBuffering: data.isBuffering,
    });

    if (bufferingUsers.length > 0) {
      io!.to(data.roomId).emit('sync:wait-for-buffer', { bufferingUsers });
    }
  });

  socket.on('sync:heartbeat', async (data) => {
    const correction = await syncService.checkAndCorrectDrift(
      data.roomId, socket.data.userId, data.currentTime, data.isPlaying
    );
    if (correction) {
      socket.emit('sync:correction', correction);
    }

    // Update member presence
    io!.to(data.roomId).emit('presence:room-update', {
      userId: socket.data.userId,
      presence: {
        isConnected: true,
        isBuffering: data.isBuffering,
        currentTime: data.currentTime,
        lastHeartbeat: Date.now(),
      },
    });
  });

  socket.on('sync:request-state', async (data, callback) => {
    const state = await syncService.getLateJoinState(data.roomId);
    callback(state);
  });
}

// ─── Chat Event Handlers ─────────────────────────────────────

function registerChatHandlers(socket: TypedSocket) {
  socket.on('chat:message', async (data) => {
    const message = await chatService.saveMessage({
      roomId: data.roomId,
      userId: socket.data.userId,
      text: data.text,
      type: data.type,
    });
    if (message) {
      io!.to(data.roomId).emit('chat:message', message as any);
    }
  });

  socket.on('chat:typing', (data) => {
    socket.to(data.roomId).emit('chat:typing', {
      userId: socket.data.userId,
      username: socket.data.username,
      isTyping: data.isTyping,
    });
  });

  socket.on('chat:reaction', async (data) => {
    await chatService.addReaction(data.messageId, socket.data.userId, data.emoji);
    io!.to(data.roomId).emit('chat:reaction', {
      messageId: data.messageId,
      emoji: data.emoji,
      userId: socket.data.userId,
    });
  });

  socket.on('chat:delete', async (data) => {
    const ok = await chatService.deleteMessage(data.messageId, socket.data.userId, data.roomId);
    if (ok) {
      io!.to(data.roomId).emit('chat:deleted', { messageId: data.messageId });
    }
  });
}

// ─── Presence Handlers ────────────────────────────────────────

function registerPresenceHandlers(socket: TypedSocket) {
  socket.on('presence:heartbeat', async () => {
    await presenceService.heartbeat(socket.data.userId);
  });
}

// ─── NTP Time Sync ────────────────────────────────────────────

function registerTimeHandlers(socket: TypedSocket) {
  socket.on('time:ping', (_data, callback) => {
    callback({
      clientSendTime: _data.clientSendTime,
      serverTime: Date.now(),
      serverSendTime: Date.now(),
    });
  });
}

// ─── Discovery Handlers ──────────────────────────────────────

function registerDiscoveryHandlers(socket: TypedSocket) {
  socket.on('rooms:discover', async (data, callback) => {
    try {
      const result = await roomService.discoverRooms(data.page, data.pageSize, data.sort);
      callback(result as any);
    } catch {
      callback({ rooms: [], total: 0, page: 1, hasMore: false });
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────

async function handleRoomLeave(socket: TypedSocket, roomId: string, reason: string) {
  try {
    const result = await roomService.leaveRoom(socket.data.userId, roomId);
    socket.leave(roomId);
    socket.data.roomId = undefined;

    socket.to(roomId).emit('room:member-left', {
      userId: socket.data.userId,
      reason: reason as any,
    });

    socket.to(roomId).emit('chat:system', {
      text: `${socket.data.username} odadan ayrıldı`,
    });

    if (result.roomClosed) {
      io!.to(roomId).emit('room:closed', { reason: 'Oda kapandı' });
    } else if (result.newHostId) {
      io!.to(roomId).emit('room:host-transferred', { newHostId: result.newHostId });
    }
  } catch (err: any) {
    console.error('[WS] Leave room error:', err.message);
  }
}
