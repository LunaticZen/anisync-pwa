const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const emojisDir = 'C:\\Users\\eemin\\Desktop\\yeni emojiler\\Yeni klasör';
const emojisJsonPath = path.join(__dirname, 'packages', 'desktop', 'src', 'components', 'room', 'emojis.json');
const repo = 'LunaticZen/live_wallpapers';
const releaseTag = 'emojis-v1';

const files = fs.readdirSync(emojisDir);
let emojisJson = JSON.parse(fs.readFileSync(emojisJsonPath, 'utf8'));

function getCategoryName(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('cat')) return 'Silly cats';
  if (lower.includes('speed')) return 'speed';
  if (lower.includes('jojo') || lower.includes('reze')) return 'Anime';
  return 'Karma';
}

console.log('Uploading files and updating JSON...');

for (const file of files) {
  const filePath = path.join(emojisDir, file);
  
  // Upload to github release
  console.log(`Uploading ${file}...`);
  try {
    execSync(`"C:\\Program Files\\GitHub CLI\\gh.exe" release upload ${releaseTag} "${filePath}" -R ${repo} --clobber`);
  } catch(e) {
    console.error(`Failed to upload ${file}:`, e.message);
  }
  
  // URL to fetch from GitHub Release
  const url = `https://github.com/${repo}/releases/download/${releaseTag}/${encodeURIComponent(file)}`;
  
  const catName = getCategoryName(file);
  let category = emojisJson.find(c => c.name === catName);
  
  if (!category) {
    category = { name: catName, emojis: [] };
    emojisJson.push(category);
  }
  
  // Remove extension for name
  const name = file.replace(/\.[^/.]+$/, "");
  
  // Check if it already exists
  if (!category.emojis.find(e => e.name === name)) {
    category.emojis.push({
      path: url,
      name: name
    });
  }
}

fs.writeFileSync(emojisJsonPath, JSON.stringify(emojisJson, null, 2));
console.log('Done!');
