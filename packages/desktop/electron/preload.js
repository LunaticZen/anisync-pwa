"use strict";
// ═══════════════════════════════════════════════════════════════
// Electron Preload — Secure IPC Bridge
// Exposes only whitelisted APIs to the renderer process
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('anisync', {
    // ── Window Controls ──
    window: {
        minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
        maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
        close: () => electron_1.ipcRenderer.invoke('window:close'),
        isMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized'),
    },
    // ── Anime Browser ──
    anime: {
        navigate: (url) => electron_1.ipcRenderer.invoke('anime:navigate', url),
        close: () => electron_1.ipcRenderer.invoke('anime:close'),
        goBack: () => electron_1.ipcRenderer.invoke('anime:goBack'),
        goForward: () => electron_1.ipcRenderer.invoke('anime:goForward'),
        reload: () => electron_1.ipcRenderer.invoke('anime:reload'),
        getUrl: () => electron_1.ipcRenderer.invoke('anime:getUrl'),
        setBounds: (rect) => electron_1.ipcRenderer.invoke('anime:setBounds', rect),
        hide: () => electron_1.ipcRenderer.invoke('anime:hide'),
        show: () => electron_1.ipcRenderer.invoke('anime:show'),
        onNavigated: (cb) => {
            const handler = (_e, url) => cb(url);
            electron_1.ipcRenderer.on('anime:navigated', handler);
            return () => electron_1.ipcRenderer.removeListener('anime:navigated', handler);
        },
    },
    // ── Player Control ──
    player: {
        play: () => electron_1.ipcRenderer.invoke('player:command', 'play'),
        pause: () => electron_1.ipcRenderer.invoke('player:command', 'pause'),
        seek: (time) => electron_1.ipcRenderer.invoke('player:command', 'seek', time),
        getState: () => electron_1.ipcRenderer.invoke('player:getState'),
        getEvent: () => electron_1.ipcRenderer.invoke('player:getEvent'),
        setSpeed: (speed) => electron_1.ipcRenderer.invoke('player:command', 'setSpeed', speed),
        onDetected: (cb) => {
            const handler = (_e, data) => cb(data);
            electron_1.ipcRenderer.on('player:detected', handler);
            return () => electron_1.ipcRenderer.removeListener('player:detected', handler);
        },
    },
    // ── App Info ──
    app: {
        version: '1.0.0',
        platform: process.platform,
    },
});
