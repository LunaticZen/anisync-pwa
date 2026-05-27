// Generate AniSync app icons for all Android mipmap densities using Node.js canvas
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'packages/mobile/app/src/main/res');
const sizes = { xxxhdpi: 192, xxhdpi: 144, xhdpi: 96, hdpi: 72, mdpi: 48 };

for (const [name, s] of Object.entries(sizes)) {
    const canvas = createCanvas(s, s);
    const ctx = canvas.getContext('2d');
    const c = s / 2;
    const r = s / 2 - 1;

    // Background circle with gradient
    const grad = ctx.createRadialGradient(c, c, 0, c, c, r);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(1, '#0d9488');
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Play triangle
    const ts = s * 0.32;
    const tx = c - ts * 0.2;
    const ty = c - ts / 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + ts, c);
    ctx.lineTo(tx, ty + ts);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    // Sync arc top
    ctx.beginPath();
    ctx.arc(c, c, s * 0.42, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(2, s / 22);
    ctx.stroke();

    // Sync arc bottom
    ctx.beginPath();
    ctx.arc(c, c, s * 0.42, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    // Arrow tips
    const ar = s * 0.42;
    const aw = Math.max(3, s / 16);

    // Top-right arrow
    const a1 = -Math.PI * 0.15;
    const ax1 = c + ar * Math.cos(a1);
    const ay1 = c + ar * Math.sin(a1);
    ctx.beginPath();
    ctx.moveTo(ax1, ay1);
    ctx.lineTo(ax1 - aw * 0.8, ay1 - aw);
    ctx.lineTo(ax1 + aw * 0.3, ay1 - aw * 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    // Bottom-left arrow
    const a2 = Math.PI * 0.85;
    const ax2 = c + ar * Math.cos(a2);
    const ay2 = c + ar * Math.sin(a2);
    ctx.beginPath();
    ctx.moveTo(ax2, ay2);
    ctx.lineTo(ax2 + aw * 0.8, ay2 + aw);
    ctx.lineTo(ax2 - aw * 0.3, ay2 + aw * 0.5);
    ctx.closePath();
    ctx.fill();

    const outDir = path.join(BASE, `mipmap-${name}`);
    fs.mkdirSync(outDir, { recursive: true });
    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outDir, 'ic_launcher.png'), buf);
    console.log(`  ${name}: ${s}x${s}`);
}
console.log('Icons generated!');
