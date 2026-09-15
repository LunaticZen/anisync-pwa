import { SiteAdapter } from './BaseAdapter';

export class HDFilmCehennemiAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('hdfilmcehennemi') > -1;
    }

    extractIframe(): boolean {
        // On PC, Electron's main.ts injects script into all sub-frames natively. No extraction needed.
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return false;

        // On Mobile, cross-origin iframes (closeload, rapidrame etc.) block injection.
        // We must extract the video provider iframe to the top level.
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                const src = iframes[i].src;
                if (src && src.startsWith('http') && !(iframes[i] as any).__anisyncExtracted) {
                    (iframes[i] as any).__anisyncExtracted = true;

                    const isSameDomain = src.indexOf(window.location.hostname) > -1;
                    const isVideoProvider = src.indexOf('closeload') > -1 ||
                        src.indexOf('rapidrame') > -1 ||
                        src.indexOf('vidmoly') > -1 ||
                        src.indexOf('tau') > -1 ||
                        src.indexOf('fembed') > -1 ||
                        src.indexOf('filemoon') > -1 ||
                        src.indexOf('streamtape') > -1 ||
                        src.indexOf('mixdrop') > -1 ||
                        src.indexOf('dood') > -1 ||
                        src.indexOf('voe') > -1 ||
                        src.indexOf('mp4upload') > -1 ||
                        src.indexOf('mega') > -1 ||
                        src.indexOf('ok.ru') > -1 ||
                        src.indexOf('player') > -1 ||
                        src.indexOf('embed') > -1 ||
                        src.indexOf('video') > -1 ||
                        src.indexOf('stream') > -1;
                    const shouldExtract = isVideoProvider && !isSameDomain;

                    if (shouldExtract) {
                        console.log('[AniSync] HDFilmCehennemiAdapter extracting iframe to top level:', src.substring(0, 80));
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

        // 2. Scan same-origin iframes for video elements (mobile fallback)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow?.document);
                    if (!doc) continue;

                    const vids = doc.querySelectorAll('video');
                    if (vids.length > 0) {
                        console.log('[AniSync] HDFilmCehennemiAdapter: Video found in IFRAME:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
                        iframes[i].setAttribute('style', 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;border:none!important;background:#000!important;');
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
                                console.log('[AniSync] HDFilmCehennemiAdapter: Video found in NESTED IFRAME');
                                iframes[i].setAttribute('style', 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;border:none!important;background:#000!important;');
                                innerIframes[k].setAttribute('style', 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;border:none!important;background:#000!important;');
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
