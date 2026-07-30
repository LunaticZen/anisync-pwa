import { SiteAdapter } from './BaseAdapter';

export class AnimecixAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('animecix') > -1;
    }

    extractIframe(): boolean {
        try {
            const fs = document.querySelectorAll('iframe');
            for (let i = 0; i < fs.length; i++) {
                const src = fs[i].src;
                if (src && src.startsWith('http') && !(fs[i] as any).__anisyncExtracted) {
                    (fs[i] as any).__anisyncExtracted = true;
                    
                    const isSameDomain = src.indexOf(window.location.hostname) > -1;
                    const isVideoProvider = src.indexOf('video')>-1 || src.indexOf('player')>-1 || src.indexOf('embed')>-1 || src.indexOf('stream')>-1 || src.indexOf('vidmoly')>-1 || src.indexOf('tau')>-1;
                    const isAnimecixInternal = src.indexOf('animecix') > -1; // Sometimes animecix embeds its own pages
                    const shouldExtract = isVideoProvider && !isSameDomain && !isAnimecixInternal;

                    if (shouldExtract) {
                        console.log('[AniSync] AnimecixAdapter extracting iframe to top level:', src);
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
        // Direct video elements
        const videos = document.querySelectorAll('video');
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (v.readyState > 0 || v.src || v.currentSrc) {
                return v;
            }
        }
        if (videos.length > 0) {
            return videos[0];
        }
        return null;
    }
}
