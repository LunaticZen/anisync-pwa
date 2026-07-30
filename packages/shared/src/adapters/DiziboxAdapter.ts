import { SiteAdapter } from './BaseAdapter';

export class DiziboxAdapter implements SiteAdapter {
    match(url: string): boolean {
        return url.indexOf('dizibox') > -1 || url.indexOf('dizipub') > -1 || url.indexOf('diziwatch') > -1;
    }

    findVideoElement(): HTMLVideoElement | null {
        // Just return direct videos. 
        // On PC, Electron's main.ts injects this script into every sub-frame, so it will find the video natively.
        // On Mobile, Dizibox is suspended per DIZIBOX_SYNC_NOTES.md.
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
