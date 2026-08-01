import { SiteAdapter } from './BaseAdapter';

export class TurkanimeAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('turkanime.tv') > -1 || url.indexOf('turkanime.co') > -1;
    }

    extractIframe(): boolean {
        // As per user request, NEVER extract iframes on Turkanime.
        // Extracting traps users on 404 pages or black player screens, breaking the Turkanime UI.
        return false;
    }

    findVideoElement(): HTMLVideoElement | null {
        // 1. Direct video elements (always works on PC because of native sub-frame injection)
        const directVideos = document.querySelectorAll('video');
        if (directVideos.length > 0) {
            for (let i = 0; i < directVideos.length; i++) {
                const v = directVideos[i];
                // Wait for video to have metadata before judging it
                const isDurationValid = v.duration > 600 || v.duration === Infinity;
                if (!v.muted && (isDurationValid || (v.readyState > 0 && isNaN(v.duration)))) {
                    return v;
                }
            }
        }

        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return null; // Let Electron's native sub-frame injection handle it

        // 2. Scan iframes for same-origin players (ONLY FOR MOBILE)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow?.document);
                    if (!doc) continue;

                    // Check for nested iframes (like turkanime.tv/embed -> turkanime.tv/player)
                    const innerIframes = doc.querySelectorAll('iframe');
                    for (let j = 0; j < innerIframes.length; j++) {
                        try {
                            const innerDoc = innerIframes[j].contentDocument || (innerIframes[j].contentWindow && innerIframes[j].contentWindow?.document);
                            if (innerDoc) {
                                const innerVids = innerDoc.querySelectorAll('video');
                                if (innerVids.length > 0) {
                                    for (let k = 0; k < innerVids.length; k++) {
                                        const v = innerVids[k];
                                        const isDurationValid = v.duration > 600 || v.duration === Infinity;
                                        if (!v.muted && (isDurationValid || (v.readyState > 0 && isNaN(v.duration)))) {
                                            console.log('[AniSync] TurkanimeAdapter: Video found in NESTED IFRAME:', innerIframes[j].src);
                                            // Removed position:fixed fullscreen logic to preserve UI
                                            return v;
                                        }
                                    }
                                }
                            }
                        } catch(e) {}
                    }

                    const vids = doc.querySelectorAll('video');
                    if (vids.length > 0) {
                        for (let k = 0; k < vids.length; k++) {
                            const v = vids[k];
                            const isDurationValid = v.duration > 600 || v.duration === Infinity;
                            if (!v.muted && (isDurationValid || (v.readyState > 0 && isNaN(v.duration)))) {
                                console.log('[AniSync] TurkanimeAdapter: Video found in IFRAME:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
                                // Removed position:fixed fullscreen logic to preserve UI
                                return v;
                            }
                        }
                    }
                } catch(e) {}
            }
        } catch(e) {}
        
        return null;
    }
}
