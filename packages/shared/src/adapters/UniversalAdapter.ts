import { SiteAdapter } from './BaseAdapter';

export class UniversalAdapter implements SiteAdapter {
    match(url: string): boolean {
        // Universal adapter runs if no specific adapter matched
        return true;
    }

    extractIframe(): boolean {
        try {
            const fs = document.querySelectorAll('iframe');
            for (let i = 0; i < fs.length; i++) {
                const src = fs[i].src;
                if (src && src.startsWith('http') && !(fs[i] as any).__anisyncExtracted) {
                    (fs[i] as any).__anisyncExtracted = true;
                    
                    const isSameDomain = src.indexOf(window.location.hostname) > -1;
                    const wList = ['molystream', 'vidmoly', 'ok.ru', 'tau', 'fembed', 'mega', 'streamtape', 'mixdrop', 'mp4upload', 'okru', 'voe.sx', 'dood'];
                    let inWList = false;
                    for(let j=0; j<wList.length; j++) { if(src.indexOf(wList[j]) > -1) { inWList = true; break; } }
                    
                    const isBigEnough = fs[i].clientWidth > 300 && fs[i].clientHeight > 150;
                    const shouldExtract = inWList && isBigEnough && !isSameDomain;

                    if (shouldExtract) {
                        console.log('[AniSync] UniversalAdapter extracting iframe to top level:', src);
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
        const videos = document.querySelectorAll('video');
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            const isValidUniversal = !v.muted && (isNaN(v.duration) || v.duration > 600);
            if (isValidUniversal && (v.readyState > 0 || v.src || v.currentSrc)) {
                return v;
            }
        }
        if (videos.length > 0) {
            const v2 = videos[0];
            const isValidUniversal2 = !v2.muted && (isNaN(v2.duration) || v2.duration > 600);
            if (isValidUniversal2) {
                return v2;
            }
        }
        return null;
    }
}
