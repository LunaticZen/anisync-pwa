import { SiteAdapter } from './BaseAdapter';
import { AnimecixAdapter } from './AnimecixAdapter';
import { DiziboxAdapter } from './DiziboxAdapter';
import { TurkanimeAdapter } from './TurkanimeAdapter';
import { UniversalAdapter } from './UniversalAdapter';

(function() {
    if ((window as any).__anisync_injected) return;
    (window as any).__anisync_injected = true;

    console.log('[AniSync] Injection script started in:', window.location.href.substring(0, 80));

    // Wait until the DOM is somewhat ready
    if (!document.body) {
        setTimeout(() => (window as any).__anisync_find_video && (window as any).__anisync_find_video(), 500);
        return;
    }

    let ignoreUntil = 0;

    function sendEvent(type: string, v: HTMLVideoElement, pWin?: any) {
        if (Date.now() < ignoreUntil) return;

        let time = v.currentTime;
        if (pWin && typeof pWin.jwplayer !== 'undefined') {
            try { time = pWin.jwplayer().getPosition(); } catch(e) {}
        }

        // Mobile Fallback
        if ((window as any).AniSyncBridge?.sendEvent) {
            (window as any).AniSyncBridge.sendEvent(type, time);
        }
        // Desktop (Electron) Fallback
        else {
            (window as any).__anisync_event = { type: type, time: time, ts: Date.now() };
        }
    }

    function hookVideo(v: HTMLVideoElement) {
        if ((v as any).__anisync_hooked) return;
        (v as any).__anisync_hooked = true;

        console.log('[AniSync] Video HOOKED in:', window.location.href.substring(0, 80));
        (window as any).__anisync_has_video = true;

        const pWin = (v.ownerDocument && v.ownerDocument.defaultView) ? (v.ownerDocument.defaultView as any) : (window as any);

        (window as any).__anisync_api = {
            play: function() { 
                ignoreUntil = Date.now() + 1000; 
                if (typeof pWin.jwplayer !== 'undefined') {
                    try { pWin.jwplayer().play(); } catch(e) { v.play(); }
                } else v.play(); 
            },
            pause: function() { 
                ignoreUntil = Date.now() + 1000; 
                if (typeof pWin.jwplayer !== 'undefined') {
                    try { pWin.jwplayer().pause(); } catch(e) { v.pause(); }
                } else v.pause(); 
            },
            seek: function(time: number) { 
                ignoreUntil = Date.now() + 1000; 
                if (typeof pWin.jwplayer !== 'undefined') {
                    try { pWin.jwplayer().seek(time); } catch(e) { v.currentTime = time; }
                } else v.currentTime = time; 
            },
            getState: function() { 
                if (typeof pWin.jwplayer !== 'undefined') {
                    try {
                        const state = pWin.jwplayer().getState();
                        return { state: (state === 'playing' || state === 'buffering') ? 'playing' : 'paused', time: pWin.jwplayer().getPosition() || v.currentTime };
                    } catch(e) {}
                }
                return { state: v.paused ? 'paused' : 'playing', time: v.currentTime }; 
            },
            getEvent: function() { 
                const ev = (window as any).__anisync_event; 
                (window as any).__anisync_event = null; 
                return ev; 
            }
        };

        v.addEventListener('play', () => sendEvent('play', v, pWin));
        v.addEventListener('pause', () => sendEvent('pause', v, pWin));
        v.addEventListener('seeked', () => sendEvent('seek', v, pWin));
        
        // Listen to jwplayer events if available
        if (typeof pWin.jwplayer !== 'undefined') {
            try {
                const jw = pWin.jwplayer();
                jw.on('play', () => sendEvent('play', v, pWin));
                jw.on('pause', () => sendEvent('pause', v, pWin));
                jw.on('seek', (e: any) => { v.currentTime = e.offset; sendEvent('seek', v, pWin); });
            } catch(e) {}
        }

        // Monitor video element removal
        setInterval(function() {
            try {
                let stillExists = false;
                if (document.body && document.body.contains(v)) { stillExists = true; }
                if (!stillExists && v.ownerDocument && v.ownerDocument.body) {
                    stillExists = v.ownerDocument.body.contains(v);
                }
                if (!stillExists) {
                    console.log('[AniSync] Video removed from DOM, unhooking');
                    (window as any).__anisync_has_video = false;
                    delete (window as any).__anisync_api;
                    (v as any).__anisync_hooked = false;
                }
            } catch(e) {}
        }, 2000);
    }

    function findAndHookVideo() {
        const loc = window.location.href;
        const adapters: SiteAdapter[] = [
            new AnimecixAdapter(),
            new DiziboxAdapter(),
            new TurkanimeAdapter(),
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

        // 1. Extraction Phase (For Mobile Cross-Origin iframes)
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

    function initAniSync() {
        findAndHookVideo();
        setTimeout(findAndHookVideo, 1000);
        setTimeout(findAndHookVideo, 3000);
        setTimeout(findAndHookVideo, 5000);
        
        // Catch videos that have their src updated later
        setInterval(findAndHookVideo, 1000);

        try {
            const observer = new MutationObserver(function() {
                findAndHookVideo();
            });
            observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
        } catch(e) {}
    }

    (window as any).__anisync_find_video = function() {
        initAniSync();
        return true;
    };
})();

(window as any).__anisync_find_video();
