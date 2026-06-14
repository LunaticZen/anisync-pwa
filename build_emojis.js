const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\emin\\Desktop\\emojiler';
const destDir = path.join(__dirname, 'packages', 'desktop', 'public', 'emojis');
const jsonDest = path.join(__dirname, 'packages', 'desktop', 'src', 'components', 'room', 'emojis.json');

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

const categories = fs.readdirSync(srcDir).filter(f => fs.statSync(path.join(srcDir, f)).isDirectory());

const emojiMap = [];

for (const cat of categories) {
  const catPath = path.join(srcDir, cat);
  const destCatPath = path.join(destDir, cat);
  fs.mkdirSync(destCatPath, { recursive: true });
  
  const files = fs.readdirSync(catPath).filter(f => /\.(png|gif|jpg|jpeg|webp|svg)$/i.test(f));
  
  const categoryData = {
    name: cat,
    emojis: []
  };

  for (const file of files) {
    const srcFile = path.join(catPath, file);
    const destFile = path.join(destCatPath, file);
    fs.copyFileSync(srcFile, destFile);
    
    // The path we will serve from /emojis/...
    const identifier = `${cat}/${file}`;
    categoryData.emojis.push({
      path: identifier,
      name: file.split('.').slice(0, -1).join('.')
    });
  }
  emojiMap.push(categoryData);
}

fs.writeFileSync(jsonDest, JSON.stringify(emojiMap, null, 2));
console.log('Emojis copied and emojis.json created successfully. Total categories:', emojiMap.length);
