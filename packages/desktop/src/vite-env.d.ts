/// <reference types="vite/client" />

declare global {
  interface Window {
    anisync: import('../electron/preload').AnisyncAPI;
  }
}

export {};
