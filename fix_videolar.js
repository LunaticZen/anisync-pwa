const fs = require('fs');
let content = fs.readFileSync('packages/server/src/index.ts', 'utf8');

const videoStaticCode = `
  // ── Serve Videos ──
  app.use('/videolar', express.static('/www/wwwroot/176.96.131.15/videolar'));
`;

if (!content.includes("app.use('/videolar'")) {
  content = content.replace("// ── Serve Frontend ──", videoStaticCode + "\n  // ── Serve Frontend ──");
  fs.writeFileSync('packages/server/src/index.ts', content);
  console.log('Fixed index.ts to serve /videolar');
} else {
  console.log('Already serving /videolar');
}
