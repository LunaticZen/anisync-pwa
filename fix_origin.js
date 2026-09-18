const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'packages/server/src/ws/gateway.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /url: data\.url,\n\s*serverTimestamp: Date\.now\(\),/g,
  "url: data.url, originUserId: socket.data.userId, serverTimestamp: Date.now(),"
);

fs.writeFileSync(file, code);
