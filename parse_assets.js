const fs = require('fs');

const contentPath = 'C:\\Users\\emin\\.gemini\\antigravity-ide\\brain\\ce22cc3d-5767-4c89-b36f-f974faa77bce\\.system_generated\\steps\\3907\\content.md';
const content = fs.readFileSync(contentPath, 'utf8');

const mapping = {};
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<span class="m-1">')) {
    const nameMatch = line.match(/<span class="m-1">(.*?)<\/span>/);
    if (nameMatch) {
      const filename = nameMatch[1].toLowerCase(); // e.g., chiikawa-6.mp4
      
      // Look at the next few lines for the video src
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.includes('<video src="https://private-user-images.githubusercontent.com/75453644/')) {
          // Extract the UUID. It looks like: .../609987061-d70a360f-17ee-4af5-b51e-54dc5bb27f42.mp4
          // The actual UUID is d70a360f-17ee-4af5-b51e-54dc5bb27f42
          const uuidMatch = nextLine.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.mp4/);
          if (uuidMatch) {
            mapping[filename] = `https://github.com/user-attachments/assets/${uuidMatch[1]}`;
          }
          break;
        }
      }
    }
  }
}

console.log(JSON.stringify(mapping, null, 2));
