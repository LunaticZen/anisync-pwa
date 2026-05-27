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
}

// ─── Anime BrowserView ────────────────────────────────────────

function createAnimeView(url: string) {
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

const PLAYER_SCRIPT = `
(function() {
  if (window.__anisync_injected) return;
  window.__anisync_injected = true;
  var ignoreUntil = 0;

  function findVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (v.readyState > 0 || v.src || v.currentSrc) {
        hookVideo(v);
        return true;
      }
    }
    // Also check for any video element even without src
    if (videos.length > 0) {
      hookVideo(videos[0]);
      return true;
    }
    return false;
  }

  function hookVideo(v) {
    console.log('[AniSync] Video HOOKED in:', window.location.href.substring(0, 80));
    window.__anisync_has_video = true;
    window.__anisync_api = {
      play: function() { ignoreUntil = Date.now() + 1000; v.play(); },
      pause: function() { ignoreUntil = Date.now() + 1000; v.pause(); },
      seek: function(t) { ignoreUntil = Date.now() + 1000; v.currentTime = t; },
      getTime: function() { return v.currentTime || 0; },
      getDuration: function() { return v.duration || 0; },
      getState: function() { return v.paused ? 'paused' : 'playing'; },
      getEvent: function() { var e = window.__anisync_event; window.__anisync_event = null; return e; },
      hasVideo: true
    };

    v.addEventListener('play', function() {
      if (Date.now() < ignoreUntil) return;
      window.__anisync_event = { type: 'play', time: v.currentTime, ts: Date.now() };
    });
    v.addEventListener('pause', function() {
      if (Date.now() < ignoreUntil) return;
      window.__anisync_event = { type: 'pause', time: v.currentTime, ts: Date.now() };
    });
    v.addEventListener('seeked', function() {
      if (Date.now() < ignoreUntil) return;
      window.__anisync_event = { type: 'seek', time: v.currentTime, ts: Date.now() };
    });

    setInterval(function() {
      if (!document.body.contains(v)) {
        window.__anisync_injected = false;
        window.__anisync_has_video = false;
        window.__anisync_api = null;
        findVideo() || startSearch();
      }
    }, 3000);
  }

  function startSearch() {
    var attempts = 0;
    var pi = setInterval(function() {
      attempts++;
      if (findVideo()) clearInterval(pi);
      if (attempts > 120) clearInterval(pi);
    }, 1000);
    try {
      var o = new MutationObserver(function() { if (findVideo()) o.disconnect(); });
      o.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch(e) {}
  }

  if (!findVideo()) startSearch();
})();
`;

async function injectAllFrames() {
  if (!animeView) return;
  const wc = animeView.webContents;

  // Inject main frame
  try { await wc.executeJavaScript(PLAYER_SCRIPT); } catch { }

  // Inject ALL sub-frames
  try {
    const mf = wc.mainFrame;
    if (mf && mf.framesInSubtree) {
      for (const frame of mf.framesInSubtree) {
        if (frame !== mf) {
          try { await frame.executeJavaScript(PLAYER_SCRIPT); } catch { }
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

ipcMain.handle('anime:navigate', (_e: any, url: string) => {
  console.log('[AniSync] Navigate to:', url);
  createAnimeView(url);
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
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('web-contents-created', (_e: any, contents: any) => { contents.setWindowOpenHandler(() => ({ action: 'deny' })); });
