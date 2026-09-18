const fs = require('fs');
let content = fs.readFileSync('packages/desktop/src/services/socket.ts', 'utf8');

content = content.replace(
  "useRoomStore.getState().setTheme(data.themeId);",
  "useRoomStore.getState().setTheme(data.theme || data.themeId);"
);

fs.writeFileSync('packages/desktop/src/services/socket.ts', content);
console.log('Fixed socket.ts theme');
