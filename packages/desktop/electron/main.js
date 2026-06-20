"use strict";
// ═══════════════════════════════════════════════════════════════
// Electron Main Process — AniSync Desktop App
// ═══════════════════════════════════════════════════════════════
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
let mainWindow = null;
let animeView = null;
let videoFrameRef = null; // Cache the frame that has the video
const isDev = !electron_1.app.isPackaged;
// ─── Dynamic Script Delivery ──────────────────────────────────
// Scripts are fetched from backend, NEVER hardcoded in EXE.
let cachedScripts = [];
let cachedAdDomains = [];
async function fetchSiteScripts(url) {
    try {
        // Determine server URL
        const serverUrl = isDev ? 'http://localhost:3000' : 'https://anisync-mug9.onrender.com';
        const res = await fetch(`${serverUrl}/api/site-scripts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        cachedScripts = (data.scripts || []).map((s) => s.code);
        cachedAdDomains = data.adDomains || [];
        console.log(`[AniSync] Fetched ${cachedScripts.length} scripts, ${cachedAdDomains.length} ad domains`);
    }
    catch (err) {
        console.error('[AniSync] Failed to fetch site scripts:', err.message);
        cachedScripts = [];
        cachedAdDomains = [];
    }
}
// ─── Main Window ──────────────────────────────────────────────
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
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
function createAnimeView(url) {
    if (!mainWindow)
        return;
    if (animeView) {
        mainWindow.removeBrowserView(animeView);
        animeView.webContents?.destroy?.();
    }
    videoFrameRef = null;
    animeView = new electron_1.BrowserView({
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false,
        },
    });
    mainWindow.addBrowserView(animeView);
    updateAnimeViewBounds();
    // Fetch scripts from backend BEFORE page loads (parallel with loadURL)
    fetchSiteScripts(url);
    animeView.webContents.loadURL(url);
    // Handle fullscreen enter/exit
    animeView.webContents.on('enter-html-full-screen', () => {
        if (!mainWindow || !animeView)
            return;
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
            if (!animeView.webContents.isFullscreen?.()) {
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
    const notifyUrl = (newUrl) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('anime:navigated', newUrl);
        }
    };
    animeView.webContents.on('did-navigate', (_e, newUrl) => notifyUrl(newUrl));
    animeView.webContents.on('did-navigate-in-page', (_e, newUrl) => notifyUrl(newUrl));
}
// BrowserView bounds — driven by renderer measurements
let lastAnimeBounds = { x: 0, y: 164, w: 800, h: 600 };
function updateAnimeViewBounds() {
    if (!mainWindow || !animeView)
        return;
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
    if (!animeView || cachedScripts.length === 0)
        return;
    const wc = animeView.webContents;
    // Inject all dynamic scripts into main frame
    for (const script of cachedScripts) {
        try {
            await wc.executeJavaScript(script);
        }
        catch { }
    }
    // Inject ALL sub-frames
    try {
        const mf = wc.mainFrame;
        if (mf && mf.framesInSubtree) {
            for (const frame of mf.framesInSubtree) {
                if (frame !== mf) {
                    for (const script of cachedScripts) {
                        try {
                            await frame.executeJavaScript(script);
                        }
                        catch { }
                    }
                }
            }
        }
    }
    catch { }
    // After injection, scan for which frame has the video
    setTimeout(() => scanForVideoFrame(), 2000);
}
async function scanForVideoFrame() {
    if (!animeView)
        return;
    const wc = animeView.webContents;
    // Check main frame
    try {
        const has = await wc.executeJavaScript('!!window.__anisync_has_video');
        if (has) {
            videoFrameRef = null;
            console.log('[AniSync] Video in MAIN frame');
            return;
        }
    }
    catch { }
    // Check sub-frames
    try {
        const mf = wc.mainFrame;
        if (mf && mf.framesInSubtree) {
            for (const frame of mf.framesInSubtree) {
                if (frame !== mf) {
                    try {
                        const has = await frame.executeJavaScript('!!window.__anisync_has_video');
                        if (has) {
                            videoFrameRef = frame;
                            console.log('[AniSync] Video in SUB-FRAME');
                            return;
                        }
                    }
                    catch { }
                }
            }
        }
    }
    catch { }
    console.log('[AniSync] Video NOT FOUND in any frame');
}
// Execute in the cached video frame
async function execVideo(js) {
    if (!animeView)
        return null;
    // If we have a cached frame ref, try it first
    if (videoFrameRef) {
        try {
            const has = await videoFrameRef.executeJavaScript('!!window.__anisync_has_video');
            if (has)
                return await videoFrameRef.executeJavaScript(js);
        }
        catch { }
        videoFrameRef = null; // Cache miss, rescan
    }
    // Try main frame
    try {
        const has = await animeView.webContents.executeJavaScript('!!window.__anisync_has_video');
        if (has)
            return await animeView.webContents.executeJavaScript(js);
    }
    catch { }
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
                    }
                    catch { }
                }
            }
        }
    }
    catch { }
    return null;
}
// ─── IPC Handlers ─────────────────────────────────────────────
electron_1.ipcMain.handle('window:minimize', () => mainWindow?.minimize());
electron_1.ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized())
        mainWindow.unmaximize();
    else
        mainWindow?.maximize();
});
electron_1.ipcMain.handle('window:close', () => mainWindow?.close());
electron_1.ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
electron_1.ipcMain.handle('anime:navigate', (_e, url) => {
    console.log('[AniSync] Navigate to:', url);
    createAnimeView(url);
});
electron_1.ipcMain.handle('anime:close', () => {
    if (animeView && mainWindow) {
        mainWindow.removeBrowserView(animeView);
        animeView.webContents?.destroy?.();
        animeView = null;
        videoFrameRef = null;
    }
});
electron_1.ipcMain.handle('anime:goBack', () => {
    if (animeView?.webContents.canGoBack())
        animeView.webContents.goBack();
});
electron_1.ipcMain.handle('anime:goForward', () => {
    if (animeView?.webContents.canGoForward())
        animeView.webContents.goForward();
});
electron_1.ipcMain.handle('anime:getUrl', () => {
    return animeView?.webContents.getURL() || '';
});
electron_1.ipcMain.handle('anime:reload', () => {
    animeView?.webContents.reload();
});
electron_1.ipcMain.handle('anime:setBounds', (_e, rect) => {
    lastAnimeBounds = rect;
    if (!mainWindow || !animeView)
        return;
    updateAnimeViewBounds();
});
electron_1.ipcMain.handle('anime:hide', () => {
    if (mainWindow && animeView) {
        mainWindow.removeBrowserView(animeView);
    }
});
electron_1.ipcMain.handle('anime:show', () => {
    if (mainWindow && animeView) {
        mainWindow.addBrowserView(animeView);
        updateAnimeViewBounds();
    }
});
electron_1.ipcMain.handle('player:command', async (_e, cmd, ...args) => {
    console.log('[AniSync] Player command:', cmd, args);
    return await execVideo(`window.__anisync_api?.${cmd}(${args.map((a) => JSON.stringify(a)).join(',')})`);
});
electron_1.ipcMain.handle('player:getState', async () => {
    return await execVideo(`
    (function() {
      var a = window.__anisync_api;
      if (!a || !a.hasVideo) return null;
      return { time: a.getTime(), duration: a.getDuration(), state: a.getState(), speed: 1 };
    })()
  `);
});
electron_1.ipcMain.handle('player:getEvent', async () => {
    return await execVideo('window.__anisync_api?.getEvent()');
});
// ─── App Lifecycle ────────────────────────────────────────────
electron_1.app.whenReady().then(async () => {
    console.log('[AniSync] Starting...');
    createWindow();
});
electron_1.app.on('window-all-closed', () => electron_1.app.quit());
electron_1.app.on('activate', () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
    createWindow(); });
electron_1.app.on('web-contents-created', (_e, contents) => { contents.setWindowOpenHandler(() => ({ action: 'deny' })); });
