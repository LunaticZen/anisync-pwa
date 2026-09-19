const fs = require('fs');
let code = fs.readFileSync('packages/server/src/ws/gateway.ts', 'utf8');

const badBlock = `  socket.on('sync:seek', async (data) => {
    const result = await syncService.processSeekEvent(data.roomId, socket.data.userId, data.time, data.generation);
    if (result) {
      io!.to(data.roomId).emit('sync:seek', {
        time: data.time,
        generation: result.generation,
        originUserId: socket.data.userId,
        serverTimestamp: Date.now(),
  });

  socket.on('sync:url-changed', (data) => {
    io!.to(data.roomId).emit('sync:url-changed', {
      url: data.url, originUserId: socket.data.userId, serverTimestamp: Date.now(),
    });
      });
    }
  });`;

const goodBlock = `  socket.on('sync:seek', async (data) => {
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
  });`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('packages/server/src/ws/gateway.ts', code);
