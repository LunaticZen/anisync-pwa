import { SiteAdapter } from './BaseAdapter';

export class DiziboxAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('dizibox') > -1 || url.indexOf('dizipub') > -1 || url.indexOf('diziwatch') > -1;
    }

    findVideoElement(): HTMLVideoElement | null {
        // Try direct first
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

        // Strategy 2: Scan iframe contentDocuments (critical for Dizibox nested cross-origin frames)
        // Note: Electron webSecurity must be false for this to work cross-origin.
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow?.document);
                    if (!doc) continue;

                    const vids = doc.querySelectorAll('video');
                    if (vids.length > 0) {
                        console.log('[AniSync] Video found in IFRAME contentDocument:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
                        // Make parent iframe full screen
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
                                console.log('[AniSync] Video found in NESTED IFRAME (2 levels deep)');
                                // Make both inner and outer iframes full screen
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
