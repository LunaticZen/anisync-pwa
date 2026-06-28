// ═══════════════════════════════════════════════════════════════
// Electron Main Process — AniSync Desktop App
// ═══════════════════════════════════════════════════════════════

import { app, BrowserWindow, BrowserView, ipcMain, session } from 'electron';
import * as path from 'path';
import { startServer } from './embedded-server';

let mainWindow: BrowserWindow | null = null;
let animeView: BrowserView | null = null;
let videoFrameRef: any = null; // Cache the frame that has the video
const isDev = !app.isPackaged;

// ─── Dizibox Multi-Platform Support ──────────────────────────
// Domain lists for Dizibox and its video providers.
// These are ONLY used for HTTP header manipulation — Animecix is never touched.

const DIZIBOX_DOMAINS = ['dizibox.vip', 'dizibox.pw', 'dizibox.live', 'dizibox.com', 'dizibox.tv'];
const VIDEO_PROVIDER_DOMAINS = [
  'vidmoly.to', 'vidmoly.me', 'vidmoly.net',
  'ok.ru', 'odnoklassniki.ru',
  'filemoon.sx', 'filemoon.to', 'filemoon.in',
  'doodstream.com', 'dood.to', 'dood.so',
  'voe.sx',
  'closeload.top', 'rapidrame.com',
];
const ALL_MANAGED_DOMAINS = [...DIZIBOX_DOMAINS, ...VIDEO_PROVIDER_DOMAINS];

function isDomainMatch(hostname: string, domainList: string[]): boolean {
  return domainList.some(d => hostname === d || hostname.endsWith('.' + d));
}

function isDiziboxRelated(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return isDomainMatch(hostname, ALL_MANAGED_DOMAINS);
  } catch { return false; }
}

function getRefererForProvider(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    // If this is a request to a video provider, set Referer to the provider's own origin
    // so the provider thinks the request is coming from its own embed page
    if (isDomainMatch(hostname, VIDEO_PROVIDER_DOMAINS)) {
      return `https://${hostname}/`;
    }
  } catch { }
  return null;
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

  // ── Dizibox: HTTP header interceptor for video providers ──
  // Only touches requests to Dizibox-related domains. Animecix traffic is NEVER affected.
  setupHeaderInterceptors(animeView);

  // Inject on every frame load
  const doInject = () => {
    setTimeout(() => injectAllFrames(), 300);
    setTimeout(() => injectAllFrames(), 1500);
    setTimeout(() => injectAllFrames(), 4000);
    setTimeout(() => injectAllFrames(), 8000);  // Dizibox: late-loading iframe embeds (Vidmoly/OK.ru)
    setTimeout(() => injectAllFrames(), 15000); // Extra safety net for very slow connections
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

// ─── Dizibox: Session Header Interceptors ────────────────────
// Manipulates HTTP headers ONLY for Dizibox video providers.
// Animecix and all other sites are completely unaffected.

function setupHeaderInterceptors(view: BrowserView) {
  const ses = view.webContents.session;

  // Outgoing requests: Set Referer for video provider domains
  ses.webRequest.onBeforeSendHeaders(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders };

      if (isDiziboxRelated(details.url)) {
        const referer = getRefererForProvider(details.url);
        if (referer) {
          headers['Referer'] = referer;
          headers['Origin'] = referer.replace(/\/$/, '');
        }
        // Ensure a common User-Agent for consistency
        if (!headers['User-Agent'] || headers['User-Agent'].includes('Electron')) {
          headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
        }
        console.log('[AniSync:Dizibox] Header fix for:', details.url.substring(0, 80));
      }

      callback({ requestHeaders: headers });
    }
  );

  // Incoming responses: Strip blocking headers from video providers
  ses.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };

      if (isDiziboxRelated(details.url)) {
        // Remove headers that block iframe embedding
        delete headers['x-frame-options'];
        delete headers['X-Frame-Options'];
        // Relax CSP for video providers so their players can load
        delete headers['content-security-policy'];
        delete headers['Content-Security-Policy'];
        delete headers['content-security-policy-report-only'];
        delete headers['Content-Security-Policy-Report-Only'];
      }

      callback({ responseHeaders: headers });
    }
  );

  console.log('[AniSync:Dizibox] Header interceptors installed');
}

// ─── App Lifecycle ────────────────────────────────────────────

app.whenReady().then(async () => {
  console.log('[AniSync] Starting...');
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('web-contents-created', (_e: any, contents: any) => { contents.setWindowOpenHandler(() => ({ action: 'deny' })); });
