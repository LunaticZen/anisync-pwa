const fs = require('fs');
let file = fs.readFileSync('packages/server/src/ws/gateway.ts', 'utf8');

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

  socket.on('sync:url-changed', (data) => {
    io!.to(data.roomId).emit('sync:url-changed', {
      url: data.url, originUserId: socket.data.userId, serverTimestamp: Date.now(),
    });
  });

  socket.on('sync:timecheck', (data) => {
    io!.to(data.roomId).emit('sync:timecheck', {
      time: data.time,
      playing: data.playing,
      userId: socket.data.userId,
    });
  });`;

if (file.includes(badBlock)) {
  file = file.replace(badBlock, goodBlock);
  fs.writeFileSync('packages/server/src/ws/gateway.ts', file);
  console.log('Fixed gateway.ts');
} else {
  console.log('Could not find bad block in gateway.ts!');
}
