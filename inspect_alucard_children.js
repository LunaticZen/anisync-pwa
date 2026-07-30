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
        
        console.log("Alucard Frame URL:", alucardFrame.url());
        
        // Let's get child frames of alucardFrame
        const childFrames = alucardFrame.childFrames();
        console.log("Alucard child frames count:", childFrames.length);
        for (let i = 0; i < childFrames.length; i++) {
            console.log(`Child Frame ${i} URL:`, childFrames[i].url());
            
            const overlays = await childFrames[i].evaluate(() => {
                const results = [];
                const elements = document.querySelectorAll('*');
                for (let j = 0; j < elements.length; j++) {
                    const el = elements[j];
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    
                    if (rect.width > 300 && rect.height > 200) {
                        if (style.position === 'absolute' || style.position === 'fixed') {
                            results.push({
                                tag: el.tagName,
                                id: el.id,
                                className: el.className,
                                zIndex: style.zIndex,
                                bg: style.backgroundColor,
                                pointerEvents: style.pointerEvents,
                                display: style.display
                            });
                        }
                    }
                }
                return results;
            });
            console.log(`Overlays in Child ${i}:`, JSON.stringify(overlays, null, 2));
        }
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
