import { SiteAdapter } from './BaseAdapter';

export class TurkanimeAdapter implements SiteAdapter {
    match(url: string): boolean {
        // Suspended: fallback to UniversalAdapter for now
        return false;
        // return url.indexOf('turkanime.tv') > -1 || url.indexOf('turkanime.co') > -1;
    }

    extractIframe(): boolean {
        // On PC, main.ts injects script into all sub-frames natively.
        // For Turkanime, we DO NOT want to extract iframes on PC because it has a complex UI (fansubs, player selections).
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return false;

        // On Mobile, extract cross-origin iframes OR nested player iframes (like ALUCARD)
        try {
            const fs = document.querySelectorAll('iframe');
            for (let i = 0; i < fs.length; i++) {
                const src = fs[i].src;
                if (!src || !src.startsWith('http')) continue;
                
                const isSameDomain = src.indexOf(window.location.hostname) > -1;
                const isVideoProvider = src.indexOf('video')>-1 || src.indexOf('player')>-1 || src.indexOf('embed')>-1 || src.indexOf('stream')>-1 || src.indexOf('vidmoly')>-1 || src.indexOf('tau')>-1 || src.indexOf('ok.ru')>-1 || src.indexOf('mail.ru')>-1 || src.indexOf('sibnet')>-1 || src.indexOf('alucard')>-1;
                const isPlayerDirect = src.indexOf('/player/') > -1 || src.indexOf('alucard') > -1;
                
                // If it's a cross-origin video provider OR a direct player iframe, extract it immediately!
                if (isVideoProvider && (!isSameDomain || isPlayerDirect) && !(fs[i] as any).__anisyncExtracted) {
                    (fs[i] as any).__anisyncExtracted = true;
                    console.log('[AniSync] TurkanimeAdapter extracting iframe to top level:', src);
                    try { if (window.top) window.top.location.href = src; else window.location.href = src; } catch(e) { window.location.href = src; }
                    return true;
                }
                
                // If it's a same-domain embed, look INSIDE it for the actual player iframe!
                if (isSameDomain && isVideoProvider) {
                    try {
                        const doc = fs[i].contentDocument || (fs[i].contentWindow && fs[i].contentWindow?.document);
                        if (doc) {
                            const innerFs = doc.querySelectorAll('iframe');
                            for (let j = 0; j < innerFs.length; j++) {
                                const innerSrc = innerFs[j].src;
                                if (innerSrc && innerSrc.startsWith('http') && !(innerFs[j] as any).__anisyncExtracted) {
                                    const innerIsPlayerDirect = innerSrc.indexOf('/player/') > -1 || innerSrc.indexOf('alucard') > -1;
                                    if (innerIsPlayerDirect) {
                                        (innerFs[j] as any).__anisyncExtracted = true;
                                        console.log('[AniSync] TurkanimeAdapter extracting nested player iframe to top level:', innerSrc);
                                        try { if (window.top) window.top.location.href = innerSrc; else window.location.href = innerSrc; } catch(e) { window.location.href = innerSrc; }
                                        return true;
                                    }
                                }
                            }
                        }
                    } catch(e) {}
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
                                            innerIframes[j].setAttribute('style', 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;border:none!important;background:#000!important;');
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
                                iframes[i].setAttribute('style', 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;border:none!important;background:#000!important;');
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
