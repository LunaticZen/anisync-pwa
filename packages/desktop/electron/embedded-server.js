"use strict";
// ═══════════════════════════════════════════════════════════════
// Embedded Server — Runs inside Electron main process
// Express + Socket.IO + In-Memory rooms, no external DB needed
// ═══════════════════════════════════════════════════════════════
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const rooms = new Map();
const codeToId = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(len = 6) {
    let c = '';
    for (let i = 0; i < len; i++)
        c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
}
function genId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function uniqueCode() {
    for (let i = 0; i < 20; i++) {
        const c = genCode();
        if (!codeToId.has(c))
            return c;
    }
    return genCode(8);
}
function formatRoom(room) {
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
function startServer(port = 3000) {
    return new Promise((resolve) => {
        const app = (0, express_1.default)();
        app.use((0, cors_1.default)({ origin: '*' }));
        app.use(express_1.default.json());
        app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
        // Dynamic script delivery — same as render-server
        app.post('/api/site-scripts', (_req, res) => {
            const fs = require('fs');
            const scriptsDir = path.join(__dirname, '..', '..', 'render-server', 'site-scripts');
            try {
                const scripts = [];
                const commonPath = path.join(scriptsDir, '_common.js');
                const playerPath = path.join(scriptsDir, '_player.js');
                const domainsPath = path.join(scriptsDir, '_common-domains.json');
                if (fs.existsSync(commonPath)) {
                    scripts.push({ type: 'js', id: 'common', code: fs.readFileSync(commonPath, 'utf8') });
                }
                if (fs.existsSync(playerPath)) {
                    scripts.push({ type: 'js', id: 'player', code: fs.readFileSync(playerPath, 'utf8') });
                }
                let adDomains = [];
                if (fs.existsSync(domainsPath)) {
                    adDomains = JSON.parse(fs.readFileSync(domainsPath, 'utf8'));
                }
                console.log(`[Scripts] Serving ${scripts.length} scripts, ${adDomains.length} ad domains`);
                res.json({ scripts, adDomains, timestamp: Date.now() });
            }
            catch (err) {
                console.error('[Scripts] Error loading scripts:', err.message);
                res.json({ scripts: [], adDomains: [], timestamp: Date.now() });
            }
        });
        const httpServer = (0, http_1.createServer)(app);
        const io = new socket_io_1.Server(httpServer, {
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
            socket.userId = username.trim();
            socket.username = username.trim();
            next();
        });
        io.on('connection', (socket) => {
            const userId = socket.userId;
            const username = socket.username;
            console.log(`[WS] Connected: ${username}`);
            // ── Time Sync ──
            socket.on('time:ping', (data, cb) => {
                if (cb)
                    cb({ clientSendTime: data.clientSendTime, serverTime: Date.now(), serverSendTime: Date.now() });
            });
            // ── Room Create ──
            socket.on('room:create', (data, cb) => {
                const code = uniqueCode();
                const id = genId();
                const room = {
                    id, code, name: data.name?.trim()?.slice(0, 50) || 'Oda',
                    hostId: userId,
                    members: new Map([[userId, { username, role: 'host', joinedAt: new Date().toISOString() }]]),
                    syncState: { isPlaying: false, currentTime: 0, playbackSpeed: 1, generation: 0, lastEventAt: Date.now() },
                    createdAt: new Date().toISOString(),
                };
                rooms.set(id, room);
                codeToId.set(code, id);
                socket.join(id);
                socket.roomId = id;
                console.log(`[Room] Created: ${room.name} (${code}) by ${username}`);
                cb({ success: true, room: formatRoom(room) });
            });
            // ── Room Join ──
            socket.on('room:join', (data, cb) => {
                const roomId = codeToId.get(data.code?.toUpperCase());
                if (!roomId || !rooms.has(roomId)) {
                    cb({ success: false, error: 'Oda bulunamadı' });
                    return;
                }
                const room = rooms.get(roomId);
                if (room.members.size >= 10) {
                    cb({ success: false, error: 'Oda dolu' });
                    return;
                }
                room.members.set(userId, { username, role: 'viewer', joinedAt: new Date().toISOString() });
                socket.join(roomId);
                socket.roomId = roomId;
                // Notify others
                socket.to(roomId).emit('room:member-joined', {
                    member: {
                        userId, username, displayName: username, avatarUrl: null,
                        role: 'viewer', joinedAt: new Date().toISOString(),
                        presence: { isConnected: true, isBuffering: false, currentTime: 0, lastHeartbeat: Date.now() },
                    },
                });
                socket.to(roomId).emit('chat:system', { text: `${username} odaya katıldı` });
                console.log(`[Room] ${username} joined ${room.name} (${room.code})`);
                cb({ success: true, room: formatRoom(room), syncState: room.syncState });
            });
            // ── Room Leave ──
            socket.on('room:leave', () => {
                handleLeave(socket, userId, username);
            });
            // ── Sync Events ──
            socket.on('sync:play', (data) => {
                const room = rooms.get(data.roomId);
                if (!room)
                    return;
                room.syncState.isPlaying = true;
                room.syncState.currentTime = data.time;
                room.syncState.generation++;
                room.syncState.lastEventAt = Date.now();
                io.to(data.roomId).emit('sync:play', {
                    time: data.time, generation: room.syncState.generation,
                    originUserId: userId, serverTimestamp: Date.now(),
                });
            });
            socket.on('sync:pause', (data) => {
                const room = rooms.get(data.roomId);
                if (!room)
                    return;
                room.syncState.isPlaying = false;
                room.syncState.currentTime = data.time;
                room.syncState.generation++;
                room.syncState.lastEventAt = Date.now();
                io.to(data.roomId).emit('sync:pause', {
                    time: data.time, generation: room.syncState.generation,
                    originUserId: userId, serverTimestamp: Date.now(),
                });
            });
            socket.on('sync:seek', (data) => {
                const room = rooms.get(data.roomId);
                if (!room)
                    return;
                room.syncState.currentTime = data.time;
                room.syncState.generation++;
                room.syncState.lastEventAt = Date.now();
                io.to(data.roomId).emit('sync:seek', {
                    time: data.time, generation: room.syncState.generation,
                    originUserId: userId, serverTimestamp: Date.now(),
                });
            });
            socket.on('sync:heartbeat', (data) => {
                io.to(data.roomId).emit('presence:room-update', {
                    userId, presence: { isConnected: true, isBuffering: data.isBuffering, currentTime: data.currentTime, lastHeartbeat: Date.now() },
                });
            });
            socket.on('sync:request-state', (data, cb) => {
                const room = rooms.get(data.roomId);
                if (room && cb)
                    cb(room.syncState);
            });
            // ── Chat ──
            socket.on('chat:message', (data) => {
                const msg = {
                    id: genId(), roomId: data.roomId, userId, username, displayName: username,
                    avatarUrl: null, text: data.text?.slice(0, 500) || '', type: data.type || 'text',
                    reactions: [], createdAt: new Date().toISOString(), editedAt: null,
                };
                io.to(data.roomId).emit('chat:message', msg);
            });
            socket.on('chat:typing', (data) => {
                socket.to(data.roomId).emit('chat:typing', { userId, username, isTyping: data.isTyping });
            });
            socket.on('chat:delete', (data) => {
                // Broadcast the deletion to everyone in the room, so their clients can remove it
                io.to(data.roomId).emit('chat:deleted', { messageId: data.messageId });
            });
            // ── Discovery ──
            socket.on('rooms:discover', (_data, cb) => {
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
            function handleLeave(sock, uid, uname) {
                const roomId = sock.roomId;
                if (!roomId)
                    return;
                const room = rooms.get(roomId);
                if (!room)
                    return;
                room.members.delete(uid);
                sock.leave(roomId);
                sock.roomId = undefined;
                if (room.members.size === 0) {
                    rooms.delete(roomId);
                    codeToId.delete(room.code);
                    console.log(`[Room] Closed: ${room.name}`);
                }
                else {
                    // Transfer host
                    if (room.hostId === uid) {
                        const newHost = room.members.keys().next().value;
                        room.hostId = newHost;
                        room.members.get(newHost).role = 'host';
                        io.to(roomId).emit('room:host-transferred', { newHostId: newHost });
                    }
                    sock.to(roomId).emit('room:member-left', { userId: uid, reason: 'left' });
                    sock.to(roomId).emit('chat:system', { text: `${uname} ayrıldı` });
                }
            }
        });
        // Serve the web UI for mobile devices
        const distPath = path.join(__dirname, '..', 'dist');
        app.use('/app', express_1.default.static(distPath));
        app.get('/app/*', (_req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
        httpServer.listen(port, '0.0.0.0', () => {
            // Get local IP for mobile access
            const os = require('os');
            const nets = os.networkInterfaces();
            let localIp = 'localhost';
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        localIp = net.address;
                        break;
                    }
                }
            }
            console.log(`[Server] AniSync sunucusu port ${port}'da çalışıyor`);
            console.log(`[Server] Mobil erişim: http://${localIp}:${port}/app`);
            resolve();
        });
    });
}
