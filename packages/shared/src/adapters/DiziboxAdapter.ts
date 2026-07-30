import { SiteAdapter } from './BaseAdapter';

export class DiziboxAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('dizibox') > -1 || url.indexOf('dizipub') > -1 || url.indexOf('diziwatch') > -1 || url.indexOf('molystream') > -1;
    }

    extractIframe(): boolean {
        // On PC, Electron's main.ts injects natively into subframes. No extraction needed.
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return false;

        // On Mobile, cross-origin iframes (molystream) block injection.
        // We must extract the molystream iframe to the top level.
        // Dizibox has nested iframes: Main -> king.php (same-origin) -> molystream (cross-origin)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                let src = iframes[i].src || '';
                
                // If this is king.php (same-origin), look inside it for molystream
                if (src.indexOf('dizibox') > -1 || src.indexOf('king') > -1 || iframes[i].contentDocument) {
                    try {
                        const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow?.document);
                        if (doc) {
                            const innerIframes = doc.querySelectorAll('iframe');
                            for (let j = 0; j < innerIframes.length; j++) {
                                const innerSrc = innerIframes[j].src;
                                if (innerSrc && innerSrc.indexOf('molystream') > -1) {
                                    console.log('[AniSync] DiziboxAdapter extracting inner molystream iframe:', innerSrc);
                                    window.location.href = innerSrc;
                                    return true;
                                }
                            }
                        }
                    } catch(e) {}
                }

                // If this is molystream directly (maybe the nested structure changed)
                if (src.indexOf('molystream') > -1 && !(iframes[i] as any).__anisyncExtracted) {
                    (iframes[i] as any).__anisyncExtracted = true;
                    console.log('[AniSync] DiziboxAdapter extracting molystream iframe:', src);
                    window.location.href = src;
                    return true;
                }
            }
        } catch(e) {}
        
        return false;
    }

    findVideoElement(): HTMLVideoElement | null {
        // Once molystream is extracted, it becomes the top-level window.
        // We can just find the direct video.
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
        return null;
    }
}
