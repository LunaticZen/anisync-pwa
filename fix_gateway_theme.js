const fs = require('fs');
let content = fs.readFileSync('packages/server/src/ws/gateway.ts', 'utf8');

content = content.replace(
  "{ theme: data.theme }",
  "{ theme: data.theme || data.themeId }"
);
content = content.replace(
  "theme: data.theme,\n        by:",
  "theme: data.theme || data.themeId,\n        by:"
);

fs.writeFileSync('packages/server/src/ws/gateway.ts', content);
console.log('Fixed gateway.ts theme payload');
