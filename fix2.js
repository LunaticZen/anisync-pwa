const fs = require('fs');
let code = fs.readFileSync('packages/server/src/ws/gateway.ts', 'utf8');

const regex = /function registerSyncHandlers\(socket: TypedSocket\) \{[\s\S]*?\}\n\n\/\/ ─── Chat Event Handlers/g;

const newBlock = `function registerSyncHandlers(socket: TypedSocket) {
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

  socket.on('sync:url-changed', async (data) => {
    const result = await syncService.processUrlChangeEvent(data.roomId, socket.data.userId, data.url);
    if (result) {
      io!.to(data.roomId).emit('sync:url-changed', {
        url: data.url, originUserId: socket.data.userId, serverTimestamp: Date.now(),
      });
    }
  });

  socket.on('sync:timecheck', (data) => {
    io!.to(data.roomId).emit('sync:timecheck', {
      time: data.time,
      playing: data.playing,
      userId: socket.data.userId,
    });
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

// ─── Chat Event Handlers`;

if (code.match(regex)) {
  code = code.replace(regex, newBlock);
  fs.writeFileSync('packages/server/src/ws/gateway.ts', code);
  console.log('Replaced successfully');
} else {
  console.log('Regex did not match');
}
