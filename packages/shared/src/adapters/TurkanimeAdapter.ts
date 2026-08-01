import { SiteAdapter } from './BaseAdapter';

export class TurkanimeAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('turkanime.tv') > -1 || url.indexOf('turkanime.co') > -1;
    }

    extractIframe(): boolean {
        // On PC, Electron's main.ts injects natively into subframes. No extraction needed.
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return false;

        // TurkAnime has a 2-stage iframe chain:
        // Stage 1: turkanime.tv/video/... page → contains turkanime.tv/embed/#/url/... iframe
        // Stage 2: turkanime.tv/embed/... page → Vue SPA loads real video provider iframe (sibnet, mail.ru, ok.ru, etc.)
        //
        // We extract each stage separately. The setInterval in index.ts will call us again
        // after each navigation.

        const loc = window.location.href;
        const isVideoPage = loc.indexOf('/video/') > -1;
        const isEmbedPage = loc.indexOf('/embed/') > -1;

        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                const src = iframes[i].src;
                if (!src || !src.startsWith('http') || (iframes[i] as any).__anisyncExtracted) continue;
                (iframes[i] as any).__anisyncExtracted = true;

                if (isVideoPage) {
                    // Stage 1: On the video page, find the turkanime embed iframe and navigate to it
                    const isTurkanimeEmbed = src.indexOf('turkanime') > -1 && src.indexOf('/embed/') > -1;
                    if (isTurkanimeEmbed) {
                        console.log('[AniSync] TurkanimeAdapter Stage 1: Extracting embed iframe:', src.substring(0, 80));
                        try { 
                            if (window.top) window.top.location.href = src; 
                            else window.location.href = src; 
                        } catch(e) { 
                            window.location.href = src; 
                        }
                        return true;
                    }
                }

                if (isEmbedPage) {
                    // Stage 2: On the embed page (Vue SPA), find the real video provider iframe
                    // Known providers: sibnet.ru, my.mail.ru, ok.ru, vidmoly, mp4upload, voe, uqload, etc.
                    const isSameDomain = src.indexOf('turkanime') > -1;
                    if (isSameDomain) continue; // Skip turkanime's own internal iframes

                    // Check if this is a known video provider or has video-related keywords
                    const providerKeywords = ['sibnet', 'mail.ru', 'ok.ru', 'vidmoly', 'mp4upload', 'voe', 
                                              'uqload', 'streamlare', 'dood', 'highload', 'hdvid', 
                                              'mixdrop', 'streamtape', 'fembed', 'video', 'player', 'embed'];
                    let isProvider = false;
                    for (let j = 0; j < providerKeywords.length; j++) {
                        if (src.indexOf(providerKeywords[j]) > -1) { isProvider = true; break; }
                    }

                    if (isProvider) {
                        console.log('[AniSync] TurkanimeAdapter Stage 2: Extracting video provider iframe:', src.substring(0, 80));
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
        // 1. Direct video elements (works on PC natively, and on mobile after extraction)
        const directVideos = document.querySelectorAll('video');
        if (directVideos.length > 0) {
            for (let i = 0; i < directVideos.length; i++) {
                const v = directVideos[i];
                if (v.readyState > 0 || v.src || v.currentSrc) {
                    return v;
                }
            }
            // If we found videos but none are ready yet, return the first one
            if (directVideos.length > 0) return directVideos[0];
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
                        console.log('[AniSync] TurkanimeAdapter: Video found in IFRAME:', iframes[i].src ? iframes[i].src.substring(0, 60) : 'no-src');
                        return vids[0];
                    }

                    // Check nested iframes (2nd level)
                    const innerIframes = doc.querySelectorAll('iframe');
                    for (let j = 0; j < innerIframes.length; j++) {
                        try {
                            const innerDoc = innerIframes[j].contentDocument || (innerIframes[j].contentWindow && innerIframes[j].contentWindow?.document);
                            if (innerDoc) {
                                const innerVids = innerDoc.querySelectorAll('video');
                                if (innerVids.length > 0) {
                                    console.log('[AniSync] TurkanimeAdapter: Video found in NESTED IFRAME');
                                    return innerVids[0];
                                }
                            }
                        } catch(e) {}
                    }
                } catch(e) {}
            }
        } catch(e) {}
        
        return null;
    }
}
