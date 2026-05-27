const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:\\Users\\emin\\.gemini\\antigravity\\brain\\3409014e-e386-4ae3-8b03-ef921eb7fcc9\\media__1779402577125.png';
const base = path.join(__dirname, 'packages', 'mobile', 'app', 'src', 'main', 'res');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function main() {
  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(base, folder);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`${folder}: ${size}x${size} OK`);
  }
  console.log('All icons generated!');
}

main().catch(e => { console.error(e); process.exit(1); });
