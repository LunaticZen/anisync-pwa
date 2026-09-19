import re

with open('packages/server/src/ws/gateway.ts', 'r') as f:
    content = f.read()

old_join = """  socket.on('room:join', async (data, callback) => {
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
  });"""

new_join = """  socket.on('room:join', async (data, callback) => {
    try {
      const result = await roomService.requestJoinRoom(socket.data.userId, data.code, data.password);
      
      if (result.status === 'pending') {
        socket.to(result.roomId).emit('room:join-requested', {
          userId: socket.data.userId,
          username: socket.data.username,
        });
        callback({ success: true, status: 'pending' });
        return;
      }

      if (result.status === 'joined') {
        socket.join(result.room!.id);
        socket.data.roomId = result.room!.id;
        await presenceService.setOnline(socket.data.userId, result.room!.id);
        callback({ success: true, status: 'joined', room: result.room as any, syncState: result.syncState });
      }
    } catch (err: any) {
      callback({ success: false, error: err.message });
    }
  });

  socket.on('room:approve-join', async (data) => {
    try {
      const result = await roomService.approveJoin(data.roomId, data.targetUserId, socket.data.userId);
      const targetSockets = await presenceService.getUserSockets(data.targetUserId);
      for (const sid of targetSockets) {
        const targetSocket = io!.sockets.sockets.get(sid);
        if (targetSocket) {
          targetSocket.join(result.room.id);
          targetSocket.data.roomId = result.room.id;
          await presenceService.setOnline(data.targetUserId, result.room.id);
          targetSocket.emit('room:join-approved', { room: result.room, syncState: result.syncState });
        }
      }
      io!.to(result.room.id).emit('room:member-joined', {
        member: {
          userId: data.targetUserId,
          username: data.targetUserId,
          displayName: data.targetUserId,
          avatarUrl: null,
          role: 'viewer',
          joinedAt: new Date().toISOString(),
          presence: { isConnected: true, isBuffering: false, currentTime: 0, lastHeartbeat: Date.now() },
        },
      });
      io!.to(result.room.id).emit('chat:system', { text: `${data.targetUserId} odaya katıldı` });
    } catch (err: any) {
      socket.emit('error', { code: 'APPROVE_FAILED', message: err.message });
    }
  });

  socket.on('room:reject-join', (data) => {
    try {
      roomService.rejectJoin(data.roomId, data.targetUserId, socket.data.userId);
      presenceService.getUserSockets(data.targetUserId).then(targetSockets => {
        for (const sid of targetSockets) {
          const targetSocket = io!.sockets.sockets.get(sid);
          if (targetSocket) {
            targetSocket.emit('room:join-rejected', { reason: 'Host isteği reddetti' });
          }
        }
      });
    } catch (err: any) {
      socket.emit('error', { code: 'REJECT_FAILED', message: err.message });
    }
  });

  socket.on('room:cancel-request', (data) => {
    try {
      roomService.cancelJoin(data.roomId, socket.data.userId);
      io!.to(data.roomId).emit('room:join-cancelled', { userId: socket.data.userId });
    } catch (err) {
      console.error('[WS] Cancel request error:', err);
    }
  });"""

new_content = content.replace(old_join, new_join)

with open('packages/server/src/ws/gateway.ts', 'w') as f:
    f.write(new_content)

print(content == new_content)
