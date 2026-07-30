import { SiteAdapter } from './BaseAdapter';

export class AnimecixAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('animecix') > -1;
    }

    extractIframe(): boolean {
        // Disabled iframe extraction to prevent black screens on modern Animecix players
        return false;
    }

    findVideoElement(): HTMLVideoElement | null {
        // 1. Direct video elements
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

        // 2. Scan iframes for tau/vidmoly
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow?.document);
                    if (!doc) continue;

                    const vids = doc.querySelectorAll('video');
                    if (vids.length > 0) {
                        console.log('[AniSync] AnimecixAdapter: Video found in IFRAME:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
                        // Make iframe full screen for host
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
                                console.log('[AniSync] AnimecixAdapter: Video found in NESTED IFRAME');
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
