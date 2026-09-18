const fs = require('fs');
const path = require('path');
const gatewayFile = path.join(__dirname, 'packages/server/src/ws/gateway.ts');
let code = fs.readFileSync(gatewayFile, 'utf8');

// Insert username into chat:message saveMessage
code = code.replace(
  /roomId: data\.roomId,\s*userId: socket\.data\.userId,\s*text: data\.text,/,
  "roomId: data.roomId, userId: socket.data.userId, username: socket.data.username, text: data.text,"
);

// Add room join request handlers
const roomHandlersPos = code.lastIndexOf('}');
const newHandlers = `
  socket.on('room:request-join', async (data, callback) => {
    try {
      const room = roomService.getRoom(data.roomId);
      if (!room) throw new Error('Oda bulunamadı');
      
      const hostSocketId = await presenceService.getUserSockets(room.hostId);
      if (hostSocketId && hostSocketId.length > 0) {
        for (const sid of hostSocketId) {
          io!.to(sid).emit('room:join-request', {
            roomId: data.roomId,
            userId: socket.data.userId,
            username: socket.data.username,
          });
        }
      }
      callback({ success: true, hostName: room.hostId, roomName: room.name });
    } catch (err: any) {
      callback({ success: false, error: err.message });
    }
  });

  socket.on('room:cancel-request', async (data) => {
    try {
      const room = roomService.getRoom(data.roomId);
      if (!room) return;
      
      const hostSocketId = await presenceService.getUserSockets(room.hostId);
      if (hostSocketId && hostSocketId.length > 0) {
        for (const sid of hostSocketId) {
          io!.to(sid).emit('room:cancel-request', {
            roomId: data.roomId,
            userId: socket.data.userId,
          });
        }
      }
    } catch (err) {}
  });

  socket.on('room:approve-join', async (data) => {
    try {
      const room = roomService.getRoom(data.roomId);
      if (!room || room.hostId !== socket.data.userId) return;
      
      const targetSockets = await presenceService.getUserSockets(data.userId);
      if (targetSockets && targetSockets.length > 0) {
        for (const sid of targetSockets) {
          io!.to(sid).emit('room:join-approved', { roomId: data.roomId, code: room.code });
        }
      }
    } catch (err) {}
  });

  socket.on('room:reject-join', async (data) => {
    try {
      const room = roomService.getRoom(data.roomId);
      if (!room || room.hostId !== socket.data.userId) return;
      
      const targetSockets = await presenceService.getUserSockets(data.userId);
      if (targetSockets && targetSockets.length > 0) {
        for (const sid of targetSockets) {
          io!.to(sid).emit('room:join-rejected', { roomId: data.roomId, reason: 'İsteğiniz reddedildi' });
        }
      }
    } catch (err) {}
  });

  socket.on('room:set-theme', async (data) => {
    try {
      const room = roomService.getRoom(data.roomId);
      if (!room || room.hostId !== socket.data.userId) return;
      
      // We do not store theme in roomService settings yet, just broadcast
      io!.to(data.roomId).emit('room:theme-changed', { themeId: data.themeId });
    } catch (err) {}
  });
}
`;

code = code.replace(/function registerRoomHandlers\(socket: TypedSocket\) \{[\s\S]*?(?=\n\n\/\/ ─── Sync Event Handlers)/, match => {
  return match.slice(0, -1) + newHandlers;
});

// Add sync:url-changed
const syncHandlersPos = code.indexOf('function registerSyncHandlers');
code = code.replace(/socket\.on\('sync:seek'[\s\S]*?(?=\s*\}\);)/, match => {
  return match + `\n  });\n\n  socket.on('sync:url-changed', (data) => {
    io!.to(data.roomId).emit('sync:url-changed', {
      url: data.url,
      serverTimestamp: Date.now(),
    });`;
});

fs.writeFileSync(gatewayFile, code);
