// ═══════════════════════════════════════════════════════════════
// Embedded Server — Runs inside Electron main process
// Express + Socket.IO + In-Memory rooms, no external DB needed
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// ─── In-Memory State ──────────────────────────────────────────

interface RoomMember {
  username: string;
  role: string;
  joinedAt: string;
}

interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  members: Map<string, RoomMember>;
  syncState: {
    isPlaying: boolean;
    currentTime: number;
    playbackSpeed: number;
    generation: number;
    lastEventAt: number;
  };
  createdAt: string;
}

const rooms = new Map<string, Room>();
const codeToId = new Map<string, string>();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode(len = 6): string {
  let c = '';
  for (let i = 0; i < len; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function uniqueCode(): string {
  for (let i = 0; i < 20; i++) { const c = genCode(); if (!codeToId.has(c)) return c; }
  return genCode(8);
}

function formatRoom(room: Room) {
  return {
    id: room.id, code: room.code, name: room.name,
    isPublic: true, hasPassword: false, hostId: room.hostId,
    maxMembers: 10, memberCount: room.members.size,
    createdAt: room.createdAt, currentAnime: null, tags: [],
    members: [...room.members.entries()].map(([userId, m]) => ({
      userId, username: m.username, displayName: m.username, avatarUrl: null,
      role: m.role, joinedAt: m.joinedAt,
      presence: { isConnected: true, isBuffering: false, currentTime: 0, lastHeartbeat: Date.now() },
    })),
    settings: {
      syncMode: 'host-authority', allowGuestControl: false,
      bufferingPolicy: 'wait-threshold', driftThresholdMs: 500,
      maxMembers: 10, chatEnabled: true, slowMode: 0,
    },
    syncState: room.syncState,
  };
}

// ─── Start Server ─────────────────────────────────────────────

export function startServer(port = 3000): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(cors({ origin: '*' }));
    app.use(express.json());

    app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: { origin: '*', credentials: true },
      pingInterval: 10000,
      pingTimeout: 20000,
    });

    // ── Auth: just username ──
    io.use((socket, next) => {
      const username = socket.handshake.auth?.username;
      if (!username || typeof username !== 'string' || username.trim().length < 1) {
        return next(new Error('USERNAME_REQUIRED'));
      }
      (socket as any).userId = username.trim();
      (socket as any).username = username.trim();
      next();
    });

    io.on('connection', (socket) => {
      const userId = (socket as any).userId as string;
      const username = (socket as any).username as string;
      console.log(`[WS] Connected: ${username}`);

      // ── Time Sync ──
      socket.on('time:ping' as any, (data: any, cb: any) => {
        if (cb) cb({ clientSendTime: data.clientSendTime, serverTime: Date.now(), serverSendTime: Date.now() });
      });

      // ── Room Create ──
      socket.on('room:create' as any, (data: any, cb: any) => {
        const code = uniqueCode();
        const id = genId();
        const room: Room = {
          id, code, name: data.name?.trim()?.slice(0, 50) || 'Oda',
          hostId: userId,
          members: new Map([[userId, { username, role: 'host', joinedAt: new Date().toISOString() }]]),
          syncState: { isPlaying: false, currentTime: 0, playbackSpeed: 1, generation: 0, lastEventAt: Date.now() },
          createdAt: new Date().toISOString(),
        };
        rooms.set(id, room);
        codeToId.set(code, id);
        socket.join(id);
        (socket as any).roomId = id;
        console.log(`[Room] Created: ${room.name} (${code}) by ${username}`);
        cb({ success: true, room: formatRoom(room) });
      });

      // ── Room Join ──
      socket.on('room:join' as any, (data: any, cb: any) => {
        const roomId = codeToId.get(data.code?.toUpperCase());
        if (!roomId || !rooms.has(roomId)) { cb({ success: false, error: 'Oda bulunamadı' }); return; }
        const room = rooms.get(roomId)!;
        if (room.members.size >= 10) { cb({ success: false, error: 'Oda dolu' }); return; }

        room.members.set(userId, { username, role: 'viewer', joinedAt: new Date().toISOString() });
        socket.join(roomId);
        (socket as any).roomId = roomId;

        // Notify others
        socket.to(roomId).emit('room:member-joined' as any, {
          member: {
            userId, username, displayName: username, avatarUrl: null,
            role: 'viewer', joinedAt: new Date().toISOString(),
            presence: { isConnected: true, isBuffering: false, currentTime: 0, lastHeartbeat: Date.now() },
          },
        });
        socket.to(roomId).emit('chat:system' as any, { text: `${username} odaya katıldı` });

        console.log(`[Room] ${username} joined ${room.name} (${room.code})`);
        cb({ success: true, room: formatRoom(room), syncState: room.syncState });
      });

      // ── Room Leave ──
      socket.on('room:leave' as any, () => {
        handleLeave(socket, userId, username);
      });

      // ── Sync Events ──
      socket.on('sync:play' as any, (data: any) => {
        const room = rooms.get(data.roomId);
        if (!room) return;
        room.syncState.isPlaying = true;
        room.syncState.currentTime = data.time;
        room.syncState.generation++;
        room.syncState.lastEventAt = Date.now();
        io.to(data.roomId).emit('sync:play' as any, {
          time: data.time, generation: room.syncState.generation,
          originUserId: userId, serverTimestamp: Date.now(),
        });
      });

      socket.on('sync:pause' as any, (data: any) => {
        const room = rooms.get(data.roomId);
        if (!room) return;
        room.syncState.isPlaying = false;
        room.syncState.currentTime = data.time;
        room.syncState.generation++;
        room.syncState.lastEventAt = Date.now();
        io.to(data.roomId).emit('sync:pause' as any, {
          time: data.time, generation: room.syncState.generation,
          originUserId: userId, serverTimestamp: Date.now(),
        });
      });

      socket.on('sync:seek' as any, (data: any) => {
        const room = rooms.get(data.roomId);
        if (!room) return;
        room.syncState.currentTime = data.time;
        room.syncState.generation++;
        room.syncState.lastEventAt = Date.now();
        io.to(data.roomId).emit('sync:seek' as any, {
          time: data.time, generation: room.syncState.generation,
          originUserId: userId, serverTimestamp: Date.now(),
        });
      });

      socket.on('sync:heartbeat' as any, (data: any) => {
        io.to(data.roomId).emit('presence:room-update' as any, {
          userId, presence: { isConnected: true, isBuffering: data.isBuffering, currentTime: data.currentTime, lastHeartbeat: Date.now() },
        });
      });

      socket.on('sync:request-state' as any, (data: any, cb: any) => {
        const room = rooms.get(data.roomId);
        if (room && cb) cb(room.syncState);
      });

      // ── Chat ──
      socket.on('chat:message' as any, (data: any) => {
        const msg = {
          id: genId(), roomId: data.roomId, userId, username, displayName: username,
          avatarUrl: null, text: data.text?.slice(0, 500) || '', type: data.type || 'text',
          reactions: [], createdAt: new Date().toISOString(), editedAt: null,
        };
        io.to(data.roomId).emit('chat:message' as any, msg);
      });

      socket.on('chat:typing' as any, (data: any) => {
        socket.to(data.roomId).emit('chat:typing' as any, { userId, username, isTyping: data.isTyping });
      });

      socket.on('chat:delete' as any, (data: any) => {
        // Broadcast the deletion to everyone in the room, so their clients can remove it
        io.to(data.roomId).emit('chat:deleted' as any, { messageId: data.messageId });
      });

      // ── Discovery ──
      socket.on('rooms:discover' as any, (_data: any, cb: any) => {
        const publicRooms = [...rooms.values()].filter(r => r.members.size > 0);
        cb({
          rooms: publicRooms.map(r => ({
            id: r.id, code: r.code, name: r.name, isPublic: true,
            hasPassword: false, hostId: r.hostId, maxMembers: 10,
            memberCount: r.members.size, createdAt: r.createdAt,
            currentAnime: null, tags: [], hostName: r.hostId,
          })),
          total: publicRooms.length, page: 1, hasMore: false,
        });
      });

      // ── Disconnect ──
      socket.on('disconnect', () => {
        console.log(`[WS] Disconnected: ${username}`);
        handleLeave(socket, userId, username);
      });

      function handleLeave(sock: any, uid: string, uname: string) {
        const roomId = sock.roomId;
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room) return;

        room.members.delete(uid);
        sock.leave(roomId);
        sock.roomId = undefined;

        if (room.members.size === 0) {
          rooms.delete(roomId);
          codeToId.delete(room.code);
          console.log(`[Room] Closed: ${room.name}`);
        } else {
          // Transfer host
          if (room.hostId === uid) {
            const newHost = room.members.keys().next().value!;
            room.hostId = newHost;
            room.members.get(newHost)!.role = 'host';
            io.to(roomId).emit('room:host-transferred' as any, { newHostId: newHost });
          }
          sock.to(roomId).emit('room:member-left' as any, { userId: uid, reason: 'left' });
          sock.to(roomId).emit('chat:system' as any, { text: `${uname} ayrıldı` });
        }
      }
    });

    // Serve the web UI for mobile devices
    const path = require('path');
    const distPath = path.join(__dirname, '..', 'dist');
    app.use('/app', express.static(distPath));
    app.get('/app/*', (_req: any, res: any) => { res.sendFile(path.join(distPath, 'index.html')); });

    httpServer.listen(port, '0.0.0.0', () => {
      // Get local IP for mobile access
      const os = require('os');
      const nets = os.networkInterfaces();
      let localIp = 'localhost';
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) { localIp = net.address; break; }
        }
      }
      console.log(`[Server] AniSync sunucusu port ${port}'da çalışıyor`);
      console.log(`[Server] Mobil erişim: http://${localIp}:${port}/app`);
      resolve();
    });
  });
}
