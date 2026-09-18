const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, 'packages/desktop/public/icon.png');
const outputPath192 = path.join(__dirname, 'packages/desktop/public/pwa-192x192.png');
const outputPath512 = path.join(__dirname, 'packages/desktop/public/pwa-512x512.png');

async function recolorIcon() {
  try {
    // Recoloring to yellow (e.g. #FFD700) using tint
    await sharp(inputPath)
      .resize(192, 192)
      .tint({ r: 255, g: 215, b: 0 })
      .toFile(outputPath192);

    await sharp(inputPath)
      .resize(512, 512)
      .tint({ r: 255, g: 215, b: 0 })
      .toFile(outputPath512);

    console.log('Icons generated successfully.');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

recolorIcon();
