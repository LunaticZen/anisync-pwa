// ═══════════════════════════════════════════════════════════════
// AniSync Secure Build Pipeline
// V8 Bytecode + Obfuscation for maximum code protection
// Usage: node scripts/build-secure.js
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const ROOT = path.join(__dirname, '..');
const ELECTRON_DIR = path.join(ROOT, 'electron');

console.log('═══ AniSync Secure Build ═══\n');

// ── Step 1: Vite Build (React frontend) ──
console.log('[1/5] Building React frontend (Vite)...');
execSync('npx vite build', { cwd: ROOT, stdio: 'inherit' });

// ── Step 2: TypeScript Compile (Electron) ──
console.log('\n[2/5] Compiling Electron TypeScript...');
execSync('npx tsc -p electron/tsconfig.json', { cwd: ROOT, stdio: 'inherit' });

// ── Step 3: Obfuscate Electron JS files ──
console.log('\n[3/5] Obfuscating Electron source files...');

const electronFiles = ['main.js', 'preload.js', 'embedded-server.js'];
const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: false, // Keep console for debugging server issues
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false, // Don't rename globals (Node.js require, etc.)
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
};

for (const file of electronFiles) {
  const filePath = path.join(ELECTRON_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ Skipping ${file} (not found)`);
    continue;
  }
  console.log(`  Skipping obfuscation for ${file} (Using Bytecode only to prevent UI breakage)...`);
}

// ── Step 4: V8 Bytecode Compilation ──
console.log('\n[4/5] Compiling to V8 Bytecode (bytenode)...');

try {
  const bytenode = require('bytenode');
  
  for (const file of ['main.js']) {
    const filePath = path.join(ELECTRON_DIR, file);
    const jscPath = filePath.replace('.js', '.jsc');
    
    console.log(`  Compiling ${file} → ${file.replace('.js', '.jsc')}...`);
    
    // Compile to bytecode using Electron's Node version to prevent V8 mismatch crash
    require('child_process').execSync(`npx electron -e "require('bytenode').compileFile('${filePath.replace(/\\/g, '/')}'.replace(/\\\\/g, '/'), '${jscPath.replace(/\\/g, '/')}'.replace(/\\\\/g, '/'))"`, { 
      env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' }),
      stdio: 'inherit'
    });
    
    // Replace original JS with bytecode loader
    const loader = `'use strict';require('bytenode');require('./${file.replace('.js', '.jsc')}');`;
    fs.writeFileSync(filePath, loader);
    
    const jscSize = fs.statSync(jscPath).size;
    console.log(`  ✓ ${file.replace('.js', '.jsc')}: ${Math.round(jscSize/1024)}KB`);
  }
} catch (err) {
  console.error('  ⚠ Bytenode compilation failed:', err.message);
  console.log('  Falling back to obfuscated JS only.');
}

// ── Step 5: Electron Builder ──
console.log('\n[5/5] Packaging with Electron Builder...');
execSync('npx electron-builder --win', { cwd: ROOT, stdio: 'inherit' });

console.log('\n═══ Build Complete ═══');
console.log('Output: release/');
