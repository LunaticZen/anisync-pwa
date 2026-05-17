// ═══════════════════════════════════════════════════════════════
// Electron Main Process — Application Shell
// ═══════════════════════════════════════════════════════════════

import { app, BrowserWindow, BrowserView, ipcMain, session, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let animeView: BrowserView | null = null;
let tray: Tray | null = null;
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'AniSync',
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: false,
    },
    show: false,
  });

  // Load React app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    animeView = null;
  });

  // Create system tray
  createTray();
}

// ─── Anime Site BrowserView ───────────────────────────────────

function createAnimeView(url: string) {
  if (!mainWindow) return;

  // Remove existing view
  if (animeView) {
    mainWindow.removeBrowserView(animeView);
    (animeView.webContents as any)?.destroy?.();
  }

  animeView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'anime-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.addBrowserView(animeView);

  // Position: leave space for sidebar (350px)
  const bounds = mainWindow.getContentBounds();
  animeView.setBounds({
    x: 0,
    y: 40, // title bar height
    width: bounds.width - 350,
    height: bounds.height - 40,
  });
  animeView.setAutoResize({ width: true, height: true });

  animeView.webContents.loadURL(url);

  // Inject content script after page loads
  animeView.webContents.on('did-finish-load', () => {
    injectContentScript();
  });

  // Handle navigation within anime site
  animeView.webContents.on('will-navigate', (_e, navUrl) => {
    mainWindow?.webContents.send('anime:navigated', navUrl);
  });
}

async function injectContentScript() {
  if (!animeView) return;

  try {
    // Inject the player detection & control script
    await animeView.webContents.executeJavaScript(`
      (function() {
        if (window.__anisync_injected) return;
        window.__anisync_injected = true;

        // Player detection system
        const PlayerDetector = {
          detected: null,
          observers: [],

          scan() {
            // 1. Direct HTML5 video
            const video = document.querySelector('video');
            if (video && video.src) {
              this.attach('html5', video);
              return;
            }

            // 2. JWPlayer
            if (window.jwplayer && typeof window.jwplayer === 'function') {
              try {
                const jw = window.jwplayer();
                if (jw && jw.getState) {
                  this.attach('jwplayer', jw);
                  return;
                }
              } catch(e) {}
            }

            // 3. iframe players
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
              if (iframe.src && (iframe.src.includes('player') || iframe.src.includes('embed'))) {
                this.attach('iframe', iframe);
                return;
              }
            }
          },

          attach(type, element) {
            this.detected = { type, element };
            window.__anisync_player = { type, element };

            // Notify Electron
            if (window.__anisync_bridge) {
              window.__anisync_bridge.postMessage('player:detected', { type });
            }
          },

          watch() {
            // MutationObserver for dynamically loaded players
            const observer = new MutationObserver(() => {
              if (!this.detected) this.scan();
            });
            observer.observe(document.body, { childList: true, subtree: true });
            this.observers.push(observer);

            // Retry scan with backoff
            let retries = 0;
            const retry = () => {
              if (this.detected || retries > 15) return;
              retries++;
              this.scan();
              setTimeout(retry, Math.min(1000 * retries, 5000));
            };
            retry();
          },

          destroy() {
            this.observers.forEach(o => o.disconnect());
            this.observers = [];
          }
        };

        // Player Control API (exposed to Electron via IPC)
        window.__anisync_api = {
          play() {
            const p = window.__anisync_player;
            if (!p) return;
            if (p.type === 'html5') p.element.play();
            else if (p.type === 'jwplayer') p.element.play();
          },
          pause() {
            const p = window.__anisync_player;
            if (!p) return;
            if (p.type === 'html5') p.element.pause();
            else if (p.type === 'jwplayer') p.element.pause();
          },
          seek(time) {
            const p = window.__anisync_player;
            if (!p) return;
            if (p.type === 'html5') p.element.currentTime = time;
            else if (p.type === 'jwplayer') p.element.seek(time);
          },
          getTime() {
            const p = window.__anisync_player;
            if (!p) return 0;
            if (p.type === 'html5') return p.element.currentTime;
            if (p.type === 'jwplayer') return p.element.getPosition();
            return 0;
          },
          getDuration() {
            const p = window.__anisync_player;
            if (!p) return 0;
            if (p.type === 'html5') return p.element.duration;
            if (p.type === 'jwplayer') return p.element.getDuration();
            return 0;
          },
          getState() {
            const p = window.__anisync_player;
            if (!p) return 'unknown';
            if (p.type === 'html5') return p.element.paused ? 'paused' : 'playing';
            if (p.type === 'jwplayer') return p.element.getState();
            return 'unknown';
          },
          setSpeed(speed) {
            const p = window.__anisync_player;
            if (!p) return;
            if (p.type === 'html5') p.element.playbackRate = speed;
            else if (p.type === 'jwplayer') p.element.setPlaybackRate(speed);
          }
        };

        PlayerDetector.scan();
        PlayerDetector.watch();
      })();
    `);
  } catch (err) {
    console.error('[Inject] Content script injection failed:', err);
  }
}

// ─── System Tray ──────────────────────────────────────────────

function createTray() {
  // Use a simple icon (in production, use proper icon file)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('AniSync');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'AniSync', type: 'normal', enabled: false },
    { type: 'separator' },
    { label: 'Göster', click: () => mainWindow?.show() },
    { label: 'Çıkış', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

// ─── IPC Handlers ─────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

ipcMain.handle('anime:navigate', (_e, url: string) => {
  createAnimeView(url);
});

ipcMain.handle('anime:close', () => {
  if (animeView && mainWindow) {
    mainWindow.removeBrowserView(animeView);
    (animeView.webContents as any)?.destroy?.();
    animeView = null;
  }
});

ipcMain.handle('player:command', async (_e, command: string, ...args: any[]) => {
  if (!animeView) return null;
  try {
    const result = await animeView.webContents.executeJavaScript(
      `window.__anisync_api?.${command}(${args.map(a => JSON.stringify(a)).join(',')})`
    );
    return result;
  } catch (err) {
    console.error(`[IPC] Player command failed: ${command}`, err);
    return null;
  }
});

ipcMain.handle('player:getState', async () => {
  if (!animeView) return null;
  try {
    const [time, duration, state, speed] = await Promise.all([
      animeView.webContents.executeJavaScript('window.__anisync_api?.getTime()'),
      animeView.webContents.executeJavaScript('window.__anisync_api?.getDuration()'),
      animeView.webContents.executeJavaScript('window.__anisync_api?.getState()'),
      animeView.webContents.executeJavaScript('window.__anisync_api?.getSpeed?.() ?? 1'),
    ]);
    return { time, duration, state, speed };
  } catch {
    return null;
  }
});

// ─── App Lifecycle ────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Security: prevent new window creation
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
