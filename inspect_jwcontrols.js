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
        
        const html = await alucardFrame.evaluate(() => {
            const controls = document.querySelector('.jw-controls');
            return controls ? controls.outerHTML : 'no controls';
        });
        
        console.log(html.substring(0, 2000)); // Print first 2000 chars to avoid huge output
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
