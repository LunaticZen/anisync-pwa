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

  // Inject on every frame load (works great for Animecix)
  const doInject = () => {
    setTimeout(() => injectAllFrames(), 300);
    setTimeout(() => injectAllFrames(), 1500);
    setTimeout(() => injectAllFrames(), 4000);
    setTimeout(() => injectAllFrames(), 8000);
  };
  animeView.webContents.on('did-finish-load', doInject);
  animeView.webContents.on('did-frame-finish-load', doInject);

  // ── Continuous Frame Scanner (critical for Dizibox) ──
  // Dizibox creates video provider iframes (Vidmoly/OK.ru) dynamically via JS.
  // These iframes may NOT trigger did-frame-finish-load reliably.
  // This scanner runs every 3s for 2 minutes, checking for new un-injected frames.
  // For Animecix: __anisync_injected guard prevents any double-hooking.
  let scanCount = 0;
  const MAX_SCANS = 40; // 40 × 3s = 2 minutes
  const continuousScanner = setInterval(async () => {
    scanCount++;
    if (!animeView || animeView.webContents.isDestroyed() || scanCount > MAX_SCANS) {
      clearInterval(continuousScanner);
      console.log('[AniSync] Continuous scanner stopped (count:', scanCount, ')');
      return;
    }

    try {
      const wc = animeView.webContents;
      const mf = wc.mainFrame;
      if (!mf || !mf.framesInSubtree) return;

      let injectedCount = 0;
      let totalFrames = 0;

      for (const frame of mf.framesInSubtree) {
        totalFrames++;
        try {
          // Check if this frame already has the script
          const alreadyInjected = await frame.executeJavaScript('!!window.__anisync_injected');
          if (!alreadyInjected) {
            await frame.executeJavaScript(PLAYER_SCRIPT);
            injectedCount++;
            console.log('[AniSync:Scanner] Injected into NEW frame #' + totalFrames);
          }
        } catch { }
      }

      if (injectedCount > 0) {
        console.log('[AniSync:Scanner] Scan #' + scanCount + ': injected ' + injectedCount + ' new frames (total: ' + totalFrames + ')');
        // Re-scan for video after new injections
        setTimeout(() => scanForVideoFrame(), 2000);
      }

      // Also check if video was found — if yes, we can slow down
      const videoFound = await execVideo('!!window.__anisync_has_video');
      if (videoFound) {
        console.log('[AniSync:Scanner] Video found! Stopping continuous scan.');
        clearInterval(continuousScanner);
      }
    } catch { }
  }, 3000);

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
// This script is injected into EVERY frame (main + sub-frames).
// For Animecix: finds <video> directly in the frame → hooks it.
// For Dizibox: also scans iframe contentDocuments (cross-origin access
//   works because BrowserView has webSecurity: false).

const PLAYER_SCRIPT = `
(function() {
  if (window.__anisync_injected) return;
  window.__anisync_injected = true;
  var ignoreUntil = 0;

  function findVideo() {
    // Strategy 1: Direct video elements in this frame (works for Animecix)
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (v.readyState > 0 || v.src || v.currentSrc) {
        hookVideo(v);
        return true;
      }
    }
    if (videos.length > 0) {
      hookVideo(videos[0]);
      return true;
    }

    // Strategy 2: Scan iframe contentDocuments (critical for Dizibox)
    // In Electron BrowserView with webSecurity:false, we CAN access
    // cross-origin iframe contentDocuments from the parent frame.
    if (scanIframes()) return true;

    return false;
  }

  // ── Dizibox fallback: scan into iframe contentDocuments ──
  function scanIframes() {
    try {
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          var doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow.document);
          if (!doc) continue;

          // Look for videos in this iframe
          var vids = doc.querySelectorAll('video');
          for (var j = 0; j < vids.length; j++) {
            var v = vids[j];
            if (v.readyState > 0 || v.src || v.currentSrc) {
              console.log('[AniSync] Video found in IFRAME contentDocument:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
              hookVideo(v);
              return true;
            }
          }
          if (vids.length > 0) {
            console.log('[AniSync] Video (no-src) found in IFRAME contentDocument:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
            hookVideo(vids[0]);
            return true;
          }

          // Also check for nested iframes (2nd level deep)
          var innerIframes = doc.querySelectorAll('iframe');
          for (var k = 0; k < innerIframes.length; k++) {
            try {
              var innerDoc = innerIframes[k].contentDocument || (innerIframes[k].contentWindow && innerIframes[k].contentWindow.document);
              if (!innerDoc) continue;
              var innerVids = innerDoc.querySelectorAll('video');
              for (var m = 0; m < innerVids.length; m++) {
                var iv = innerVids[m];
                if (iv.readyState > 0 || iv.src || iv.currentSrc) {
                  console.log('[AniSync] Video found in NESTED IFRAME (2 levels deep)');
                  hookVideo(iv);
                  return true;
                }
              }
              if (innerVids.length > 0) {
                hookVideo(innerVids[0]);
                return true;
              }
            } catch(e) { /* cross-origin nested iframe, skip */ }
          }
        } catch(e) { /* cross-origin iframe, skip */ }
      }
    } catch(e) {}
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

    // Monitor video element removal
    setInterval(function() {
      try {
        // Check if video is still in ANY document (could be iframe)
        var stillExists = false;
        if (document.body && document.body.contains(v)) { stillExists = true; }
        // Also check if video's ownerDocument still has it
        if (!stillExists && v.ownerDocument && v.ownerDocument.body) {
          stillExists = v.ownerDocument.body.contains(v);
        }
        if (!stillExists) {
          window.__anisync_injected = false;
          window.__anisync_has_video = false;
          window.__anisync_api = null;
          findVideo() || startSearch();
        }
      } catch(e) {
        // If checking fails, reset and search again
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

// ─── Timeout-protected executeJavaScript ──────────────────────
// Cross-origin frames can cause executeJavaScript to hang forever.
// This wrapper adds a timeout to prevent blocking the entire injection flow.

function executeWithTimeout(target: any, code: string, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    target.executeJavaScript(code)
      .then((result: any) => { clearTimeout(timer); resolve(result); })
      .catch((err: any) => { clearTimeout(timer); reject(err); });
  });
}

async function injectAllFrames() {
  if (!animeView || animeView.webContents.isDestroyed()) return;
  const wc = animeView.webContents;
  let frameCount = 0;
  let injectedCount = 0;
  let failCount = 0;

  console.log('[AniSync] injectAllFrames() starting...');

  // Inject main frame
  try {
    const alreadyDone = await executeWithTimeout(wc, '!!window.__anisync_injected');
    if (!alreadyDone) {
      await executeWithTimeout(wc, PLAYER_SCRIPT, 5000);
      injectedCount++;
      console.log('[AniSync] Injected MAIN frame:', wc.getURL().substring(0, 60));
    }
    frameCount++;
  } catch (e: any) {
    console.log('[AniSync] Main frame inject error:', e.message);
    failCount++;
  }

  // Inject ALL sub-frames
  try {
    const mf = wc.mainFrame;
    if (mf && mf.framesInSubtree) {
      const frames = [...mf.framesInSubtree]; // snapshot to avoid mutation issues
      console.log('[AniSync] Found', frames.length, 'frames in subtree');

      for (const frame of frames) {
        if (frame === mf) continue;
        frameCount++;
        const frameUrl = (frame as any).url || 'unknown';
        try {
          const alreadyDone = await executeWithTimeout(frame, '!!window.__anisync_injected');
          if (!alreadyDone) {
            await executeWithTimeout(frame, PLAYER_SCRIPT, 5000);
            injectedCount++;
            console.log('[AniSync] Injected sub-frame:', frameUrl.substring(0, 60));
          }
        } catch (e: any) {
          failCount++;
          console.log('[AniSync] Sub-frame FAILED:', frameUrl.substring(0, 60), '-', e.message);
        }
      }
    }
  } catch (e: any) {
    console.log('[AniSync] framesInSubtree error:', e.message);
  }

  console.log('[AniSync] Injection done: ' + injectedCount + ' injected, ' + failCount + ' failed, ' + frameCount + ' total frames');

  // After injection, scan for which frame has the video
  setTimeout(() => scanForVideoFrame(), 2000);
}

async function scanForVideoFrame() {
  if (!animeView || animeView.webContents.isDestroyed()) return;
  const wc = animeView.webContents;

  // Check main frame
  try {
    const has = await executeWithTimeout(wc, '!!window.__anisync_has_video');
    if (has) {
      videoFrameRef = null;
      console.log('[AniSync] Video found in MAIN frame');
      return;
    }
  } catch { }

  // Check sub-frames
  try {
    const mf = wc.mainFrame;
    if (mf && mf.framesInSubtree) {
      for (const frame of mf.framesInSubtree) {
        if (frame === mf) continue;
        try {
          const has = await executeWithTimeout(frame, '!!window.__anisync_has_video');
          if (has) {
            videoFrameRef = frame;
            console.log('[AniSync] Video found in SUB-FRAME:', (frame as any).url?.substring(0, 60) || 'unknown');
            return;
          }
        } catch { }
      }
    }
  } catch { }
  console.log('[AniSync] Video NOT FOUND in any frame');
}

// Execute in the cached video frame
async function execVideo(js: string): Promise<any> {
  if (!animeView || animeView.webContents.isDestroyed()) return null;

  // If we have a cached frame ref, try it first
  if (videoFrameRef) {
    try {
      const has = await executeWithTimeout(videoFrameRef, '!!window.__anisync_has_video');
      if (has) return await executeWithTimeout(videoFrameRef, js);
    } catch { }
    videoFrameRef = null; // Cache miss, rescan
  }

  // Try main frame
  try {
    const has = await executeWithTimeout(animeView.webContents, '!!window.__anisync_has_video');
    if (has) return await executeWithTimeout(animeView.webContents, js);
  } catch { }

  // Try all sub-frames
  try {
    const mf = animeView.webContents.mainFrame;
    if (mf && mf.framesInSubtree) {
      for (const frame of mf.framesInSubtree) {
        if (frame !== mf) {
          try {
            const has = await executeWithTimeout(frame, '!!window.__anisync_has_video');
            if (has) {
              videoFrameRef = frame; // Cache it
              return await executeWithTimeout(frame, js);
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

let stateLogCounter = 0;
ipcMain.handle('player:getState', async () => {
  const result = await execVideo(`
    (function() {
      var a = window.__anisync_api;
      if (!a || !a.hasVideo) return null;
      return { time: a.getTime(), duration: a.getDuration(), state: a.getState(), speed: 1 };
    })()
  `);
  stateLogCounter++;
  if (stateLogCounter % 10 === 1 || result) {
    console.log('[AniSync] player:getState =', result ? JSON.stringify(result).substring(0, 80) : 'null');
  }
  return result;
});

ipcMain.handle('player:getEvent', async () => {
  const result = await execVideo('window.__anisync_api?.getEvent()');
  if (result) {
    console.log('[AniSync] player:getEvent =', JSON.stringify(result));
  }
  return result;
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

      // Delete sec-ch-ua headers to avoid exposing Electron
      // Avoid touching User-Agent here to prevent duplicate headers (user-agent vs User-Agent)
      // which causes Cloudflare Turnstile infinite redirect loops.
      // app.userAgentFallback handles the User-Agent globally anyway.
      Object.keys(headers).forEach(key => {
        if (key.toLowerCase().startsWith('sec-ch-ua')) {
          delete headers[key];
        }
      });

      if (isDiziboxRelated(details.url)) {
        const referer = getRefererForProvider(details.url);
        if (referer) {
          headers['Referer'] = referer;
          headers['Origin'] = referer.replace(/\/$/, '');
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

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

app.whenReady().then(async () => {
  console.log('[AniSync] Starting...');
  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('web-contents-created', (_e: any, contents: any) => { contents.setWindowOpenHandler(() => ({ action: 'deny' })); });
