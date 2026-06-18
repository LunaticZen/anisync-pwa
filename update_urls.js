const fs = require('fs');
const path = require('path');

const constantsPath = path.join(__dirname, 'packages', 'desktop', 'src', 'components', 'room', 'constants.tsx');
let content = fs.readFileSync(constantsPath, 'utf8');

const mapping = {
  "chiikawa-3.mp4": "https://github.com/user-attachments/assets/bbc946f9-3569-42f6-b3b0-3287169a05e2",
  "shorekeeper-music-of-the-tides.1920x1080.mp4": "https://github.com/user-attachments/assets/7b958516-07f1-490f-9161-c1517816ba44",
  "evening-drive-and-windmills.1920x1080.mp4": "https://github.com/user-attachments/assets/4aca7612-b966-4fb0-bb70-c242e49b5666",
  "imperial-rest.mp4": "https://github.com/user-attachments/assets/da7d610c-77db-45f7-9a4d-602c5e8759c3",
  "wave-symphony.1920x1080.mp4": "https://github.com/user-attachments/assets/8b045b2d-2844-4b4c-86a2-598880fa08eb",
  "forest-creek.1920x1080.mp4": "https://github.com/user-attachments/assets/874784da-3f94-4d50-a46f-1b067633bbd2",
  "lake-by-snowy-peaks.1920x1080.mp4": "https://github.com/user-attachments/assets/6e8c8b79-1270-4c5b-b100-8faea8e3b982",
  "cartethyia-reflections-beneath.1920x1080.mp4": "https://github.com/user-attachments/assets/0f3b2477-a2f3-41d5-a678-9d2aa371f60f",
  "chiikawa-1.mp4": "https://github.com/user-attachments/assets/192b8bcc-b5b8-4a07-9316-ba43d22b8261",
  "lake-on-windy-day.1920x1080.mp4": "https://github.com/user-attachments/assets/38d23c79-25b8-40ca-beb7-1c4857c9a8ce",
  "blurred-sunset-while-raining.1920x1080.mp4": "https://github.com/user-attachments/assets/db8ab85f-df0e-4b4d-9b21-677010effd05",
  "gamer-chisa-wuthering-waves.1920x1080.mp4": "https://github.com/user-attachments/assets/68428597-e07c-4305-bb2f-3f922ef1fca4",
  "lucy-wuthering-waves.1920x1080.mp4": "https://github.com/user-attachments/assets/6ef4a02f-fbf2-45b9-a335-6752a9077e90",
  "chiikawa-4.mp4": "https://github.com/user-attachments/assets/c19eb592-d2b4-4205-8772-567dc11b66da",
  "raindrop-on-window.1920x1080.mp4": "https://github.com/user-attachments/assets/f05cdd64-eb20-4132-bd97-8206935bb7b8",
  "chiikawa-2.mp4": "https://github.com/user-attachments/assets/4f942415-274b-4e59-b8b2-8e47fc94cb08",
  "solitary-reflection.1920x1080.mp4": "https://github.com/user-attachments/assets/a78b82fd-ffd4-42a8-bb5d-f3f84d5950c9",
  "chiikawa-6.mp4": "https://github.com/user-attachments/assets/02c21fd2-0c9f-4b16-af61-09f8505f50bf",
  "chiikawa-5.mp4": "https://github.com/user-attachments/assets/f3c10d6c-d085-490d-80d5-57103c1aaa15",
  "jellyfish-swarm.1920x1080.mp4": "https://github.com/user-attachments/assets/d70a360f-17ee-4af5-b51e-54dc5bb27f42"
};

for (const [filename, url] of Object.entries(mapping)) {
  const localPath = `./themes/live/${filename}`;
  content = content.replace(`video: '${localPath}'`, `video: '${url}'`);
}

fs.writeFileSync(constantsPath, content);
console.log('constants.tsx updated with remote video URLs.');
