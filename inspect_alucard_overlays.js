const puppeteer = require('puppeteer-core');

(async () => {
    try {
        const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
        const pages = await browser.pages();
        const page = pages.find(p => p.url().includes('turkanime.tv/video/steins-gate-0-1-bolum'));
        
        const iframes = page.frames();
        let alucardFrame = null;
        for (const frame of iframes) {
            if (frame.url().includes('alucard') || frame.url().includes('player')) {
                alucardFrame = frame;
            }
        }
        
        if (!alucardFrame) {
            console.log("No alucard frame found");
            process.exit(1);
        }
        
        const overlays = await alucardFrame.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('*');
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (!el.getBoundingClientRect) continue;
                
                const rect = el.getBoundingClientRect();
                if (rect.width > 200 && rect.height > 150) {
                    const style = window.getComputedStyle(el);
                    // Check if it's positioned over other things
                    if (style.position === 'absolute' || style.position === 'fixed') {
                        // Check if it's not the main video element
                        if (el.tagName !== 'VIDEO') {
                            results.push({
                                tag: el.tagName,
                                id: el.id,
                                className: el.className,
                                zIndex: style.zIndex,
                                bg: style.backgroundColor,
                                opacity: style.opacity,
                                display: style.display,
                                pointerEvents: style.pointerEvents,
                                rect: {w: rect.width, h: rect.height}
                            });
                        }
                    }
                }
            }
            return results;
        });
        
        console.log("Large Overlays:", JSON.stringify(overlays, null, 2));
        
        // Let's also dump all script sources
        const scripts = await alucardFrame.evaluate(() => {
            return Array.from(document.querySelectorAll('script')).map(s => s.src).filter(s => s);
        });
        console.log("Scripts:", scripts);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
