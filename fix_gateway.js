const fs = require('fs');
let content = fs.readFileSync('packages/server/src/ws/gateway.ts', 'utf8');

// Fix sync:url-changed
content = content.replace(
  "        serverTimestamp: Date.now(),\n  });\n\n  socket.on('sync:url-changed', (data) => {\n    io!.to(data.roomId).emit('sync:url-changed', {\n      url: data.url, originUserId: socket.data.userId, serverTimestamp: Date.now(),\n    });\n      });\n    }\n  });",
  "        serverTimestamp: Date.now(),\n      });\n    }\n  });\n\n  socket.on('sync:url-changed', (data) => {\n    io!.to(data.roomId).emit('sync:url-changed', {\n      url: data.url, originUserId: socket.data.userId, serverTimestamp: Date.now(),\n    });\n  });"
);

// Add missing room events before the closing brace of registerRoomHandlers
const roomEvents = `
  socket.on('room:request-join', (data) => {
    const room = roomService.getRoom(data.roomId);
    if (!room) return;
    const host = room.members.find(m => m.role === 'host');
    if (host) {
      io!.to(data.roomId).emit('room:join-requested', {
        userId: socket.data.userId,
        username: socket.data.username,
      });
    }
  });

  socket.on('room:approve-join', (data) => {
    io!.to(data.roomId).emit('room:join-approved', { userId: data.userId });
  });

  socket.on('room:reject-join', (data) => {
    io!.to(data.roomId).emit('room:join-rejected', { userId: data.userId });
  });

  socket.on('room:set-theme', async (data) => {
    try {
      await roomService.updateSettings(data.roomId, socket.data.userId, { theme: data.theme });
      io!.to(data.roomId).emit('room:theme-changed', {
        theme: data.theme,
        by: socket.data.userId,
      });
    } catch (err) {
      socket.emit('error', { code: 'THEME_FAILED', message: err.message });
    }
  });
`;

if (!content.includes('room:request-join')) {
  content = content.replace(
    "    } catch (err: any) {\n      socket.emit('error', { code: 'TRANSFER_FAILED', message: err.message });\n    }\n  });\n}",
    "    } catch (err: any) {\n      socket.emit('error', { code: 'TRANSFER_FAILED', message: err.message });\n    }\n  });\n" + roomEvents + "\n}"
  );
}

fs.writeFileSync('packages/server/src/ws/gateway.ts', content);
console.log('Fixed gateway.ts');
