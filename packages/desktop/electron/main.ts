// ═══════════════════════════════════════════════════════════════
// Electron Main Process — AniSync Desktop App
// ═══════════════════════════════════════════════════════════════

import { app, BrowserWindow, BrowserView, ipcMain } from 'electron';
import * as path from 'path';
import { startServer } from './embedded-server';

let mainWindow: BrowserWindow | null = null;
let animeView: BrowserView | null = null;
let videoFrameRef: any = null; // Cache the frame that has the video
const isDev = !app.isPackaged;

// ─── Dynamic Script Delivery ──────────────────────────────────
// Scripts are fetched from backend, NEVER hardcoded in EXE.
let cachedScripts: string[] = [];
let cachedAdDomains: string[] = [];

async function fetchSiteScripts(url: string): Promise<void> {
  try {
    // Try fetching from cloud server first
    const serverUrl = isDev ? 'http://localhost:3000' : 'https://anisync-mug9.onrender.com';
    const res = await fetch(`${serverUrl}/api/site-scripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedScripts = (data.scripts || []).map((s: any) => s.code);
    cachedAdDomains = data.adDomains || [];
    console.log(`[AniSync] Fetched ${cachedScripts.length} scripts, ${cachedAdDomains.length} ad domains`);
  } catch (err: any) {
    console.warn('[AniSync] Backend fetch failed, trying local fallback:', err.message);
    // Fallback: read script files directly from render-server/site-scripts/
    try {
      const fs = require('fs');
      const scriptsDir = path.join(__dirname, '..', '..', 'render-server', 'site-scripts');
      const commonPath = path.join(scriptsDir, '_common.js');
      const playerPath = path.join(scriptsDir, '_player.js');
      const domainsPath = path.join(scriptsDir, '_common-domains.json');
      
      const scripts: string[] = [];
      if (fs.existsSync(commonPath)) scripts.push(fs.readFileSync(commonPath, 'utf8'));
      if (fs.existsSync(playerPath)) scripts.push(fs.readFileSync(playerPath, 'utf8'));
      cachedScripts = scripts;
      
      if (fs.existsSync(domainsPath)) {
        cachedAdDomains = JSON.parse(fs.readFileSync(domainsPath, 'utf8'));
      }
      console.log(`[AniSync] Loaded ${cachedScripts.length} scripts from local files`);
    } catch (localErr: any) {
      console.error('[AniSync] Local fallback also failed:', localErr.message);
      cachedScripts = [];
      cachedAdDomains = [];
    }
  }
}

// ─── Main Window ──────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'AniSync',
    frame: false,
    backgroundColor: '#050816',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; animeView = null; });

  // Production: Block DevTools completely
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }
}

// ─── Anime BrowserView ────────────────────────────────────────

async function createAnimeView(url: string) {
  if (!mainWindow) return;
  if (animeView) {
    mainWindow.removeBrowserView(animeView);
    (animeView.webContents as any)?.destroy?.();
  }
  videoFrameRef = null;

  animeView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });
  mainWindow.addBrowserView(animeView);
  updateAnimeViewBounds();

  // Fetch scripts from backend BEFORE loading the page
  await fetchSiteScripts(url);

  animeView.webContents.loadURL(url);

  // Handle fullscreen enter/exit
  animeView.webContents.on('enter-html-full-screen', () => {
    if (!mainWindow || !animeView) return;
    const [w, h] = mainWindow.getContentSize();
    animeView.setBounds({ x: 0, y: 0, width: w, height: h });
  });
  animeView.webContents.on('leave-html-full-screen', () => {
    updateAnimeViewBounds();
  });

  // Recalculate bounds on window resize
  mainWindow.on('resize', () => {
    if (animeView && !animeView.webContents.isDestroyed()) {
      // Only update if not in fullscreen
      if (!(animeView.webContents as any).isFullscreen?.()) {
        updateAnimeViewBounds();
      }
    }
  });

  // Inject on every frame load
  const doInject = () => {
    setTimeout(() => injectAllFrames(), 300);
    setTimeout(() => injectAllFrames(), 1500);
    setTimeout(() => injectAllFrames(), 4000);
    setTimeout(() => injectAllFrames(), 8000); // Extra late retry for slow pages
  };
  animeView.webContents.on('did-finish-load', doInject);
  animeView.webContents.on('did-frame-finish-load', doInject);

  // Track URL changes
  const notifyUrl = (newUrl: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('anime:navigated', newUrl);
    }
  };
  animeView.webContents.on('did-navigate', (_e: any, newUrl: string) => notifyUrl(newUrl));
  animeView.webContents.on('did-navigate-in-page', (_e: any, newUrl: string) => notifyUrl(newUrl));
}

// BrowserView bounds — driven by renderer measurements
let lastAnimeBounds = { x: 0, y: 164, w: 800, h: 600 };

function updateAnimeViewBounds() {
  if (!mainWindow || !animeView) return;
  const b = lastAnimeBounds;
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  const w = Math.max(200, Math.round(b.w));
  const h = Math.max(100, Math.round(b.h));
  console.log('[AniSync] setBounds:', { x, y, w, h });
  animeView.setBounds({ x, y, width: w, height: h });
}

// ─── Player Script ───────────────────────────────────────────
// Scripts are fetched dynamically from backend via fetchSiteScripts().
// NO hardcoded bypass/ad-block code in this file.

async function injectAllFrames() {
  if (!animeView) return;

  // If scripts not yet loaded, wait up to 5s with retries
  if (cachedScripts.length === 0) {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (cachedScripts.length > 0) break;
    }
    if (cachedScripts.length === 0) {
      console.log('[AniSync] No scripts available, skipping injection');
      return;
    }
  }

  const wc = animeView.webContents;

  // Inject all dynamic scripts into main frame
  for (const script of cachedScripts) {
    try { await wc.executeJavaScript(script); } catch { }
  }

  // Inject ALL sub-frames
  try {
    const mf = wc.mainFrame;
    if (mf && mf.framesInSubtree) {
      for (const frame of mf.framesInSubtree) {
        if (frame !== mf) {
          for (const script of cachedScripts) {
            try { await frame.executeJavaScript(script); } catch { }
          }
        }
      }
    }
  } catch { }

  // After injection, scan for which frame has the video
  setTimeout(() => scanForVideoFrame(), 2000);
}

async function scanForVideoFrame() {
  if (!animeView) return;
  const wc = animeView.webContents;

  // Check main frame
  try {
    const has = await wc.executeJavaScript('!!window.__anisync_has_video');
    if (has) { videoFrameRef = null; console.log('[AniSync] Video in MAIN frame'); return; }
  } catch { }

  // Check sub-frames
  try {
    const mf = wc.mainFrame;
    if (mf && mf.framesInSubtree) {
      for (const frame of mf.framesInSubtree) {
        if (frame !== mf) {
          try {
            const has = await frame.executeJavaScript('!!window.__anisync_has_video');
            if (has) { videoFrameRef = frame; console.log('[AniSync] Video in SUB-FRAME'); return; }
          } catch { }
        }
      }
    }
  } catch { }
  console.log('[AniSync] Video NOT FOUND in any frame');
}

// Execute in the cached video frame
async function execVideo(js: string): Promise<any> {
  if (!animeView) return null;

  // If we have a cached frame ref, try it first
  if (videoFrameRef) {
    try {
      const has = await videoFrameRef.executeJavaScript('!!window.__anisync_has_video');
      if (has) return await videoFrameRef.executeJavaScript(js);
    } catch { }
    videoFrameRef = null; // Cache miss, rescan
  }

  // Try main frame
  try {
    const has = await animeView.webContents.executeJavaScript('!!window.__anisync_has_video');
    if (has) return await animeView.webContents.executeJavaScript(js);
  } catch { }

  // Try all sub-frames
  try {
    const mf = animeView.webContents.mainFrame;
    if (mf && mf.framesInSubtree) {
      for (const frame of mf.framesInSubtree) {
        if (frame !== mf) {
          try {
            const has = await frame.executeJavaScript('!!window.__anisync_has_video');
            if (has) {
              videoFrameRef = frame; // Cache it
              return await frame.executeJavaScript(js);
            }
          } catch { }
        }
      }
    }
  } catch { }

  return null;
}

// ─── IPC Handlers ─────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

ipcMain.handle('anime:navigate', async (_e: any, url: string) => {
  console.log('[AniSync] Navigate to:', url);
  await createAnimeView(url);
});
ipcMain.handle('anime:close', () => {
  if (animeView && mainWindow) {
    mainWindow.removeBrowserView(animeView);
    (animeView.webContents as any)?.destroy?.();
    animeView = null;
    videoFrameRef = null;
  }
});
ipcMain.handle('anime:goBack', () => {
  if (animeView?.webContents.canGoBack()) animeView.webContents.goBack();
});
ipcMain.handle('anime:goForward', () => {
  if (animeView?.webContents.canGoForward()) animeView.webContents.goForward();
});
ipcMain.handle('anime:getUrl', () => {
  return animeView?.webContents.getURL() || '';
});
ipcMain.handle('anime:reload', () => {
  animeView?.webContents.reload();
});
ipcMain.handle('anime:setBounds', (_e: any, rect: { x: number; y: number; w: number; h: number }) => {
  lastAnimeBounds = rect;
  if (!mainWindow || !animeView) return;
  updateAnimeViewBounds();
});
ipcMain.handle('anime:hide', () => {
  if (mainWindow && animeView) {
    mainWindow.removeBrowserView(animeView);
  }
});
ipcMain.handle('anime:show', () => {
  if (mainWindow && animeView) {
    mainWindow.addBrowserView(animeView);
    updateAnimeViewBounds();
  }
});

ipcMain.handle('player:command', async (_e: any, cmd: string, ...args: any[]) => {
  console.log('[AniSync] Player command:', cmd, args);
  return await execVideo(`window.__anisync_api?.${cmd}(${args.map((a: any) => JSON.stringify(a)).join(',')})`);
});

ipcMain.handle('player:getState', async () => {
  return await execVideo(`
    (function() {
      var a = window.__anisync_api;
      if (!a || !a.hasVideo) return null;
      return { time: a.getTime(), duration: a.getDuration(), state: a.getState(), speed: 1 };
    })()
  `);
});

ipcMain.handle('player:getEvent', async () => {
  return await execVideo('window.__anisync_api?.getEvent()');
});

// ─── App Lifecycle ────────────────────────────────────────────

app.whenReady().then(async () => {
  console.log('[AniSync] Starting...');
  // Start embedded server in dev mode for local API access
  if (isDev) {
    try {
      await startServer(3000);
      console.log('[AniSync] Embedded server started on port 3000');
    } catch (err: any) {
      console.warn('[AniSync] Embedded server failed:', err.message);
    }
  }
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('web-contents-created', (_e: any, contents: any) => { contents.setWindowOpenHandler(() => ({ action: 'deny' })); });
