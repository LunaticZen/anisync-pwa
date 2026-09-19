const fs = require('fs');
let content = fs.readFileSync('packages/server/src/index.ts', 'utf8');

// Insert path import if not present
if (!content.includes("import path from 'path';")) {
  content = content.replace("import express from 'express';", "import express from 'express';\nimport path from 'path';");
}

// Insert static serving before error handler
const staticCode = `
  // ── Serve Frontend ──
  const desktopDist = path.join(__dirname, '../../desktop/dist');
  app.use(express.static(desktopDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(desktopDist, 'index.html'));
  });

  // ── Error Handler ──
`;

content = content.replace("  // ── Error Handler ──", staticCode);

fs.writeFileSync('packages/server/src/index.ts', content);
console.log('Fixed index.ts to serve frontend');
