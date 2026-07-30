const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const desktopOut = path.resolve(__dirname, '../desktop/electron/adapters/inject.js');
const mobileAssets = path.resolve(__dirname, '../mobile/app/src/main/assets');
const mobileOut = path.resolve(mobileAssets, 'inject.js');

if (!fs.existsSync(mobileAssets)) {
    fs.mkdirSync(mobileAssets, { recursive: true });
}

esbuild.build({
  entryPoints: [path.resolve(__dirname, 'src/adapters/index.ts')],
  bundle: true,
  outfile: desktopOut,
  format: 'iife',
  minify: true,
  target: ['es2015']
}).then(() => {
  console.log('[AniSync] Desktop adapter bundled successfully.');
  
  // Copy to Mobile
  fs.copyFileSync(desktopOut, mobileOut);
  console.log('[AniSync] Mobile adapter copied to assets successfully.');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
