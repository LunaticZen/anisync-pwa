let ignoreUntil = 0;

export function hookPrototypes(hookVideoFn: (v: HTMLVideoElement) => void) {
    if ((window as any).__anisync_prototype_hooked) return;
    (window as any).__anisync_prototype_hooked = true;
    
    const origPlay = HTMLVideoElement.prototype.play;
    HTMLVideoElement.prototype.play = function() { 
        hookVideoFn(this as HTMLVideoElement); 
        return origPlay.apply(this, arguments as any); 
    };
    
    const origPause = HTMLVideoElement.prototype.pause;
    HTMLVideoElement.prototype.pause = function() { 
        hookVideoFn(this as HTMLVideoElement); 
        return origPause.apply(this, arguments as any); 
    };
}

export function hookVideo(v: HTMLVideoElement) {
    if ((v as any).__anisync_hooked) return;
    (v as any).__anisync_hooked = true;

    console.log('[AniSync] Video HOOKED in:', window.location.href.substring(0, 80));
    (window as any).__anisync_has_video = true;
    (window as any).__anisync_api = {
        play: function() { ignoreUntil = Date.now() + 1000; v.play(); },
        pause: function() { ignoreUntil = Date.now() + 1000; v.pause(); },
        seek: function(t: number) { ignoreUntil = Date.now() + 1000; v.currentTime = t; },
        getTime: function() { return v.currentTime || 0; },
        getDuration: function() { return v.duration || 0; },
        getState: function() { return v.paused ? 'paused' : 'playing'; },
        getEvent: function() { 
            const e = (window as any).__anisync_event; 
            (window as any).__anisync_event = null; 
            return e; 
        },
        hasVideo: true
    };

    function sendEvent(type: string) {
        if (Date.now() < ignoreUntil) return;
        // Mobile (Java) Bridge
        if ((window as any).AniSyncAnimeBridge) {
            (window as any).AniSyncAnimeBridge.sendEvent(type, v.currentTime, !v.paused);
        } 
        // Mobile CORS Bypass (Iframe to Parent)
        else if (window.parent && window !== window.parent && (window as any).__mobileVideoTime !== undefined) {
            window.parent.postMessage({ anisyncEvent: type, time: v.currentTime, playing: !v.paused }, '*');
        } 
        // Desktop (Electron) Fallback
        else {
            (window as any).__anisync_event = { type: type, time: v.currentTime, ts: Date.now() };
        }
    }

    v.addEventListener('play', () => sendEvent('play'));
    v.addEventListener('pause', () => sendEvent('pause'));
    v.addEventListener('seeked', () => sendEvent('seek'));

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
            } else {
                 // Mobile requires constant timecheck heartbeat for precision
                 if ((window as any).AniSyncAnimeBridge) {
                     (window as any).AniSyncAnimeBridge.sendEvent('timecheck', v.currentTime, !v.paused);
                 }
            }
        } catch(e) {}
    }, 1000); // reduced to 1000 for mobile heartbeat
}
