export interface SiteAdapter {
    match(url: string): boolean;
    extractIframe?(): boolean;
    findVideoElement(): HTMLVideoElement | null;
}
