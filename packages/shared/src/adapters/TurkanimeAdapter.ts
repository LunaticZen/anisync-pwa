import { SiteAdapter } from './BaseAdapter';

export class TurkanimeAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('turkanime.tv') > -1 || url.indexOf('turkanime.co') > -1;
    }

    extractIframe(): boolean {
        // On PC, main.ts injects script into all sub-frames natively.
        // For Turkanime, we DO NOT want to extract iframes on PC because it has a complex UI (fansubs, player selections).
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return false;

        // On Mobile, we do need to extract cross-origin iframes (like ok.ru, vidmoly) to bypass CORS.
        // However, we should only extract if a video player is actually selected.
        try {
            const fs = document.querySelectorAll('iframe');
            for (let i = 0; i < fs.length; i++) {
                const src = fs[i].src;
                if (src && src.startsWith('http') && !(fs[i] as any).__anisyncExtracted) {
                    const isSameDomain = src.indexOf(window.location.hostname) > -1;
                    const isVideoProvider = src.indexOf('video')>-1 || src.indexOf('player')>-1 || src.indexOf('embed')>-1 || src.indexOf('stream')>-1 || src.indexOf('vidmoly')>-1 || src.indexOf('tau')>-1 || src.indexOf('ok.ru')>-1 || src.indexOf('mail.ru')>-1 || src.indexOf('sibnet')>-1;
                    const shouldExtract = isVideoProvider && !isSameDomain;

                    if (shouldExtract) {
                        (fs[i] as any).__anisyncExtracted = true;
                        console.log('[AniSync] TurkanimeAdapter extracting iframe to top level:', src);
                        try { 
                            if (window.top) window.top.location.href = src; 
                            else window.location.href = src; 
                        } catch(e) { 
                            window.location.href = src; 
                        }
                        return true;
                    }
                }
            }
        } catch(e) {}
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

        // 2. Scan iframes for same-origin players (ONLY FOR MOBILE)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow?.document);
                    if (!doc) continue;

                    const vids = doc.querySelectorAll('video');
                    if (vids.length > 0) {
                        console.log('[AniSync] TurkanimeAdapter: Video found in IFRAME:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
                        iframes[i].setAttribute('style', 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;border:none!important;background:#000!important;');
                        return vids[0];
                    }
                } catch(e) {}
            }
        } catch(e) {}
        
        return null;
    }
}
