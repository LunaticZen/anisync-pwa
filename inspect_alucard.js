const puppeteer = require('puppeteer-core');

(async () => {
    try {
        const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
        const pages = await browser.pages();
        const page = pages.find(p => p.url().includes('turkanime.tv/video/steins-gate-0-1-bolum'));
        
        if (!page) {
            console.log("Page not found");
            process.exit(1);
        }

        // We want to find the alucard player iframe and inspect its body
        const iframes = page.frames();
        let alucardFrame = null;
        for (const frame of iframes) {
            if (frame.url().includes('alucard') || frame.url().includes('player')) {
                alucardFrame = frame;
                break;
            }
        }
        
        if (!alucardFrame) {
            console.log("Alucard frame not found in page. Dumping all frames:");
            iframes.forEach(f => console.log(f.url()));
            process.exit(1);
        }
        
        console.log("Found Alucard Frame:", alucardFrame.url());
        
        // Find elements with a background color or opacity that might be grayish
        const overlays = await alucardFrame.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('*');
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                
                // If it covers a large part of the screen
                if (rect.width > 300 && rect.height > 200) {
                    if (style.position === 'absolute' || style.position === 'fixed' || style.position === 'relative') {
                        if (style.zIndex !== 'auto') {
                            results.push({
                                tag: el.tagName,
                                id: el.id,
                                className: el.className,
                                zIndex: style.zIndex,
                                width: rect.width,
                                height: rect.height,
                                bg: style.backgroundColor,
                                opacity: style.opacity,
                                pointerEvents: style.pointerEvents,
                                display: style.display
                            });
                        }
                    }
                }
            }
            return results;
        });
        
        console.log("Large Absolute/Fixed Elements in Alucard:", JSON.stringify(overlays, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
