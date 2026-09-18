import { SiteAdapter } from './BaseAdapter';

export class TurkanimeAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('turkanime.tv') > -1 || url.indexOf('turkanime.co') > -1;
    }

    extractIframe(): boolean {
        // On PC, Electron's main.ts injects natively into subframes. No extraction needed.
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) return false;

        // TurkAnime iframe chain:
        //   turkanime.tv/video/... page
        //     └─ iframe: turkanime.tv/embed/#/url/ENCRYPTED (same-origin, DOM accessible)
        //         └─ iframe: sibnet.ru/... or mail.ru/... (cross-origin)
        //
        // CRITICAL: Do NOT extract the turkanime embed iframe itself!
        // The embed SPA needs to stay inside the parent page to decrypt video data.
        // Instead, we look INSIDE the same-origin embed iframe to find the real
        // video provider iframe, then extract THAT directly.

        // const loc = window.location.href;

        try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
                const iframe = iframes[i];
                const src = iframe.src || '';
                if (!src) continue;

                // Look inside same-origin turkanime embed iframe for the real video provider
                if (src.indexOf('turkanime') > -1 && src.indexOf('/embed/') > -1) {
                    try {
                        const embedDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                        if (!embedDoc) continue; // Not loaded yet or cross-origin — wait for next iteration

                        // Search for nested video provider iframes inside the embed
                        const nestedIframes = embedDoc.querySelectorAll('iframe');
                        for (let j = 0; j < nestedIframes.length; j++) {
                            const nestedSrc = nestedIframes[j].src || '';
                            if (!nestedSrc || nestedSrc.indexOf('turkanime') > -1) continue;
                            if ((nestedIframes[j] as any).__anisyncExtracted) continue;
                            (nestedIframes[j] as any).__anisyncExtracted = true;

                            // Check if this is a known video provider
                            const providerKeywords = [
                                'sibnet', 'mail.ru', 'ok.ru', 'vidmoly', 'mp4upload', 'voe',
                                'uqload', 'streamlare', 'dood', 'highload', 'hdvid',
                                'mixdrop', 'streamtape', 'fembed', 'myvi.ru', 'rutube',
                                'sendvid', 'dailymotion', 'youtube'
                            ];
                            let isProvider = false;
                            for (let k = 0; k < providerKeywords.length; k++) {
                                if (nestedSrc.indexOf(providerKeywords[k]) > -1) { isProvider = true; break; }
                            }

                            if (isProvider) {
                                console.log('[AniSync] TurkanimeAdapter: Extracting provider from embed:', nestedSrc.substring(0, 80));
                                try {
                                    if (window.top) window.top.location.href = nestedSrc;
                                    else window.location.href = nestedSrc;
                                } catch(e) {
                                    window.location.href = nestedSrc;
                                }
                                return true;
                            }
                        }
                    } catch(e) {
                        // Embed iframe DOM not accessible yet — will retry on next interval
                    }
                    // Do NOT mark the embed iframe as extracted — we need to keep checking
                    // until the SPA decrypts and loads the real provider iframe
                    continue;
                }
            }
        } catch(e) {}

        return false;
    }

    findVideoElement(): HTMLVideoElement | null {
        // 1. Direct video elements (works after extraction or on PC with native injection)
        const directVideos = document.querySelectorAll('video');
        if (directVideos.length > 0) {
            for (let i = 0; i < directVideos.length; i++) {
                const v = directVideos[i];
                if (v.readyState > 0 || v.src || v.currentSrc) {
                    return v;
                }
            }
            // Return first video as fallback if any exist
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
