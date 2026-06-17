const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\emin\\Desktop\\yeniemojiler';
const destDir = path.join(__dirname, 'packages', 'desktop', 'public', 'emojis');
const jsonPath = path.join(__dirname, 'packages', 'desktop', 'src', 'components', 'room', 'emojis.json');

// Read existing JSON
let emojisData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Read new folders
const categories = fs.readdirSync(srcDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

categories.forEach(category => {
  const categorySrcPath = path.join(srcDir, category);
  const categoryDestPath = path.join(destDir, category);
  
  // Create destination folder
  if (!fs.existsSync(categoryDestPath)) {
    fs.mkdirSync(categoryDestPath, { recursive: true });
  }

  const categoryJson = {
    name: category,
    emojis: []
  };

  // Process files
  const files = fs.readdirSync(categorySrcPath);
  files.forEach(file => {
    // Only process images (you can add more extensions if needed)
    if (file.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      const srcFile = path.join(categorySrcPath, file);
      const destFile = path.join(categoryDestPath, file);
      
      // Copy file
      fs.copyFileSync(srcFile, destFile);
      
      // Add to JSON
      const nameWithoutExt = path.parse(file).name;
      categoryJson.emojis.push({
        path: `${category}/${file}`,
        name: nameWithoutExt
      });
    }
  });

  // Check if category already exists in JSON to avoid duplicates
  const existingIndex = emojisData.findIndex(c => c.name === category);
  if (existingIndex >= 0) {
    emojisData[existingIndex] = categoryJson;
  } else {
    emojisData.push(categoryJson);
  }
});

// Write JSON back
fs.writeFileSync(jsonPath, JSON.stringify(emojisData, null, 2));
console.log('Emojis successfully updated!');
