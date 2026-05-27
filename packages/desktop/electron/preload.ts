// ═══════════════════════════════════════════════════════════════
// Electron Preload — Secure IPC Bridge
// Exposes only whitelisted APIs to the renderer process
// ═══════════════════════════════════════════════════════════════

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('anisync', {
  // ── Window Controls ──
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // ── Anime Browser ──
  anime: {
    navigate: (url: string) => ipcRenderer.invoke('anime:navigate', url),
    close: () => ipcRenderer.invoke('anime:close'),
    goBack: () => ipcRenderer.invoke('anime:goBack'),
    goForward: () => ipcRenderer.invoke('anime:goForward'),
    reload: () => ipcRenderer.invoke('anime:reload'),
    getUrl: () => ipcRenderer.invoke('anime:getUrl'),
    setBounds: (rect: { x: number; y: number; w: number; h: number }) => ipcRenderer.invoke('anime:setBounds', rect),
    hide: () => ipcRenderer.invoke('anime:hide'),
    show: () => ipcRenderer.invoke('anime:show'),
    onNavigated: (cb: (url: string) => void) => {
      const handler = (_e: any, url: string) => cb(url);
      ipcRenderer.on('anime:navigated', handler);
      return () => ipcRenderer.removeListener('anime:navigated', handler);
    },
  },

  // ── Player Control ──
  player: {
    play: () => ipcRenderer.invoke('player:command', 'play'),
    pause: () => ipcRenderer.invoke('player:command', 'pause'),
    seek: (time: number) => ipcRenderer.invoke('player:command', 'seek', time),
    getState: () => ipcRenderer.invoke('player:getState'),
    getEvent: () => ipcRenderer.invoke('player:getEvent'),
    setSpeed: (speed: number) => ipcRenderer.invoke('player:command', 'setSpeed', speed),
    onDetected: (cb: (data: any) => void) => {
      const handler = (_e: any, data: any) => cb(data);
      ipcRenderer.on('player:detected', handler);
      return () => ipcRenderer.removeListener('player:detected', handler);
    },
  },

  // ── App Info ──
  app: {
    version: '1.0.0',
    platform: process.platform,
  },
});

// Type declaration for renderer
export interface AnisyncAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  anime: {
    navigate: (url: string) => Promise<void>;
    close: () => Promise<void>;
    onNavigated: (cb: (url: string) => void) => () => void;
  };
  player: {
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seek: (time: number) => Promise<void>;
    getState: () => Promise<{ time: number; duration: number; state: string; speed: number } | null>;
    setSpeed: (speed: number) => Promise<void>;
    onDetected: (cb: (data: any) => void) => () => void;
  };
  app: {
    version: string;
    platform: string;
  };
}
