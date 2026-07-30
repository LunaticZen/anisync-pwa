import { SiteAdapter } from './BaseAdapter';

export class AnimecixAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('animecix') > -1;
    }

    extractIframe(): boolean {
        // We DO NOT extract iframes for Animecix.
        // As noted in DIZIBOX_SYNC_NOTES.md, Animecix uses same-origin iframes
        // which can be accessed directly via fs[i].contentDocument.querySelector('video').
        // Extracting them breaks the sync logic and UI.
        return false;
    }

    findVideoElement(): HTMLVideoElement | null {
        // 1. Direct video elements (always works on PC because of native sub-frame injection)
        const directVideos = document.querySelectorAll('video');
        if (directVideos.length > 0) {
            for (let i = 0; i < directVideos.length; i++) {
                const v = directVideos[i];
                if (v.readyState > 0 || v.src || v.currentSrc) {
                    return v;
                }
            }
            return directVideos[0];
        }

        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return null; // Let Electron's native sub-frame injection handle it

        // 2. Scan iframes for tau/vidmoly (ONLY FOR MOBILE, as per DIZIBOX_SYNC_NOTES.md where same-origin works)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow?.document);
                    if (!doc) continue;

                    const vids = doc.querySelectorAll('video');
                    if (vids.length > 0) {
                        console.log('[AniSync] AnimecixAdapter: Video found in IFRAME:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
                        return vids[0];
                    }

                    // Nested iframes (2nd level deep)
                    const innerIframes = doc.querySelectorAll('iframe');
                    for (let k = 0; k < innerIframes.length; k++) {
                        try {
                            const innerDoc = innerIframes[k].contentDocument || (innerIframes[k].contentWindow && innerIframes[k].contentWindow?.document);
                            if (!innerDoc) continue;
                            const innerVids = innerDoc.querySelectorAll('video');
                            if (innerVids.length > 0) {
                                console.log('[AniSync] AnimecixAdapter: Video found in NESTED IFRAME');
                                return innerVids[0];
                            }
                        } catch(e) {}
                    }
                } catch(e) {}
            }
        } catch(e) {}
        
        return null;
    }
}
