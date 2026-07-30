import { SiteAdapter } from './BaseAdapter';
import { AnimecixAdapter } from './AnimecixAdapter';
import { DiziboxAdapter } from './DiziboxAdapter';
import { UniversalAdapter } from './UniversalAdapter';
import { hookVideo, hookPrototypes } from './VideoHooker';

(function() {
    if ((window as any).__anisync_injected) return;
    (window as any).__anisync_injected = true;

    // Hook prototypes early in case video elements are created dynamically
    hookPrototypes(hookVideo);

    function findAndHookVideo() {
        const loc = window.location.href;
        const adapters: SiteAdapter[] = [
            new AnimecixAdapter(),
            new DiziboxAdapter(),
            new UniversalAdapter() // Always keep Universal last as fallback
        ];

        let activeAdapter: SiteAdapter | null = null;
        for (const adapter of adapters) {
            if (adapter.match(loc)) {
                activeAdapter = adapter;
                break;
            }
        }

        if (!activeAdapter) return false;

        // 1. Iframe Extraction Phase
        if (activeAdapter.extractIframe && activeAdapter.extractIframe()) {
            return true; // Extraction handled (will redirect window)
        }

        // 2. Finding Video Phase
        const video = activeAdapter.findVideoElement();
        if (video) {
            hookVideo(video);
            return true;
        }

        return false;
    }

    // Attempt immediately, and if fails, we could retry on DOM changes.
    // However, original logic was executed on intervals/mutation observer from main.ts
    // In original code, the entire PLAYER_SCRIPT was repeatedly injected or it didn't retry internally unless main.ts triggered it.
    // Actually, in main.ts, executeJavaScript is called repeatedly until findVideo() returned true!
    // But since this is a bundle, we need to return the boolean to the executeJavaScript caller.
    // Wait, the injected script evaluates to the return value of findVideoAndHook().
    (window as any).__anisync_find_video = findAndHookVideo;
})();

// Execute immediately and return the result to Electron's executeJavaScript
(window as any).__anisync_find_video();
