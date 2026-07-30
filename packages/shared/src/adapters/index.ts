import { SiteAdapter } from './BaseAdapter';
import { AnimecixAdapter } from './AnimecixAdapter';
import { DiziboxAdapter } from './DiziboxAdapter';
import { UniversalAdapter } from './UniversalAdapter';
import { hookVideo, hookPrototypes } from './VideoHooker';

(function() {
    if ((window as any).__anisync_injected) return;
    (window as any).__anisync_injected = true;

    // Ad-blocker CSS
    const s = document.createElement('style');
    s.id = 'anisync-adblock';
    s.textContent = `
    [class*="ad-"],[class*="ads-"],[id*="ad-"],[id*="ads-"],
    [class*="banner"],[class*="popup"],[class*="reklam"],[id*="reklam"],
    .adsbygoogle,ins.adsbygoogle,[class*="AdContainer"],[class*="ad_wrapper"],
    div[data-ad],div[data-ads],iframe[src*="doubleclick"],iframe[src*="googlesyndication"],
    [class*="overlay"]:not(video):not([class*="player"]),
    [class*="modal"]:not([class*="player"])
    {display:none!important;height:0!important;overflow:hidden!important;}
    `;
    document.head.appendChild(s);

    // Popup blocker & navigator
    window.open = function(u) { if(u) window.location.href = u; return null; };
    document.addEventListener('click', function(e) {
        let t = e.target as HTMLElement;
        while(t && t.tagName !== 'A') t = t.parentElement as HTMLElement;
        if(t && t.tagName === 'A' && (t as HTMLAnchorElement).target === '_blank' && (t as HTMLAnchorElement).href) {
            const href = (t as HTMLAnchorElement).href.toLowerCase();
            if(href.indexOf('ad')>-1 || href.indexOf('click')>-1 || href.indexOf('track')>-1) {
                e.preventDefault(); e.stopPropagation();
            } else {
                e.preventDefault(); window.location.href = href;
            }
        }
    }, true);

    // Video letterbox CSS
    const s2 = document.createElement('style');
    s2.textContent = 'video{object-fit:contain!important;max-width:100%!important;max-height:100%!important;}';
    document.head.appendChild(s2);

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
