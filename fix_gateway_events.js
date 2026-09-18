const fs = require('fs');
let content = fs.readFileSync('packages/server/src/ws/gateway.ts', 'utf8');

// Fix event name mismatch
content = content.replace(
  "emit('room:join-requested',",
  "emit('room:join-request',"
);

fs.writeFileSync('packages/server/src/ws/gateway.ts', content);
console.log('Fixed gateway.ts event names');
