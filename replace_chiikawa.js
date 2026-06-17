const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\emin\\Desktop\\chiikawa_kal_pc_gifs';
const destDir = path.join(__dirname, 'packages', 'desktop', 'public', 'emojis', 'chiikawa');
const jsonPath = path.join(__dirname, 'packages', 'desktop', 'src', 'components', 'room', 'emojis.json');

// 1. Delete destination directory if exists
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

// 2. Create destination directory
fs.mkdirSync(destDir, { recursive: true });

// 3. Copy files
const files = fs.readdirSync(srcDir);
const emojisList = [];

files.forEach(file => {
  if (file.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    
    fs.copyFileSync(srcFile, destFile);
    
    const nameWithoutExt = path.parse(file).name;
    emojisList.push({
      path: `chiikawa/${file}`,
      name: nameWithoutExt
    });
  }
});

// 4. Update JSON
let emojisData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const categoryIndex = emojisData.findIndex(c => c.name === 'chiikawa');

if (categoryIndex >= 0) {
  emojisData[categoryIndex].emojis = emojisList;
} else {
  emojisData.push({
    name: 'chiikawa',
    emojis: emojisList
  });
}

fs.writeFileSync(jsonPath, JSON.stringify(emojisData, null, 2));
console.log('Chiikawa emojis replaced successfully!');
