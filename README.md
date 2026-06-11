<div align="center">
  <img src="https://raw.githubusercontent.com/LunaticZen/anisync/main/assets/logo.png" alt="AniSync Logo" width="150"/>
  <h1>AniSync</h1>
  <p>Anime Watch Party & Synchronized Streaming Platform</p>
</div>

## 📺 Overview
AniSync is a modern, cross-platform application (Windows Desktop & Android) that allows you and your friends to watch anime together perfectly synchronized in real-time. It features built-in chat, automatic synchronization, and a beautiful, dynamic UI with multiple premium themes.

## ✨ Features
* **Perfect Synchronization:** Watch anime together with millimeter-perfect syncing. If someone pauses, it pauses for everyone.
* **Cross-Platform:** Available as a Windows Desktop application and an Android mobile app.
* **Premium Themes:** Includes "Minimal Gemini Dark" and "Anime Sync Classic" dynamic color themes.
* **Watch Parties:** Create rooms, invite friends, and start watching instantly.
* **Real-time Chat:** Communicate with your watch party members directly within the app.

## 🚀 Download & Installation

The easiest way to install AniSync is to download the compiled binaries from the [Releases](../../releases/latest) page.

### For Windows:
1. Download `AniSync-Windows.zip` from the latest release.
2. Extract the folder to your desired location.
3. Run `AniSync.exe` inside the folder. No installation required!

### For Android:
1. Download `AniSync.apk` from the latest release.
2. Transfer it to your Android device (or download directly on your phone).
3. Open the APK to install. *(You may need to allow installation from unknown sources).*

## 🛠️ Development Setup

If you want to modify or compile the project yourself:

### Prerequisites
* Node.js (v20+)
* npm

### Installation
```bash
# Clone the repository
git clone https://github.com/LunaticZen/anisync_1.0.git

# Navigate into the directory
cd anisync_1.0

# Install dependencies
npm install
```

### Running Locally
```bash
# Start the Desktop App
npm run dev:desktop

# Start the Local Server
npm run dev:server
```

### Building
```bash
# Build Windows EXE
npm run build:desktop
npm run package

# Build Android APK (Requires Android Studio/Gradle)
cd packages/mobile
gradlew assembleDebug
```

## 📄 License
This project is for personal use and watch parties.
