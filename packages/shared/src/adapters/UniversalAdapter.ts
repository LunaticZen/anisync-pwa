import { SiteAdapter } from './BaseAdapter';

export class UniversalAdapter implements SiteAdapter {
    match(url: string): boolean {
        // Universal adapter runs if no specific adapter matched
        return true;
    }

    extractIframe(): boolean {
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return false;
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
        // 1. Check direct video tags
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
        return null;
    }
}
