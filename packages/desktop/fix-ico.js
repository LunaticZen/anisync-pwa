const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;
const fs = require('fs');

async function run() {
  try {
    const tempPng = 'build/temp_icon.png';
    // 1. Read the input file (which might have a fake .png extension but be a JPEG/WEBP), resize/crop to 256x256, and force output to real PNG.
    await sharp('C:\\Users\\emin\\Desktop\\anisync_logo_circles.png')
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(tempPng);
    
    // 2. Convert the real PNG to ICO
    const buf = await pngToIco(tempPng);
    fs.writeFileSync('build/icon.ico', buf);
    console.log('Success! Created build/icon.ico');
  } catch (err) {
    console.error('Error in fix-ico.js:', err);
    process.exit(1);
  }
}

run();
