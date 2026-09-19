const fs = require('fs');
let code = fs.readFileSync('packages/server/src/ws/gateway.ts', 'utf8');

const startIdx = code.indexOf("socket.on('sync:seek'");
const endIdx = code.indexOf("socket.on('sync:speed'");

if (startIdx !== -1 && endIdx !== -1) {
  const badPart = code.substring(startIdx, endIdx);
  console.log("Found bad part:", badPart);
  
  const goodPart = `socket.on('sync:seek', async (data) => {
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

  `;
  
  code = code.replace(badPart, goodPart);
  fs.writeFileSync('packages/server/src/ws/gateway.ts', code);
  console.log("Fixed!");
} else {
  console.log("Could not find start/end indices");
}
