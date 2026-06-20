const fs = require('fs');
let code = fs.readFileSync('packages/mobile/app/src/main/java/com/anisync/mobile/MainActivity.java', 'utf8');

const oldBridgeStart = 'mainWebView.addJavascriptInterface(new Object() {';
const oldBridgeEnd = '        }, "AniSyncBridge");';

let startIdx = code.indexOf(oldBridgeStart);
let endIdx = code.indexOf(oldBridgeEnd);

if (startIdx !== -1 && endIdx !== -1) {
    let bridgeLogic = code.substring(startIdx + oldBridgeStart.length, endIdx);
    
    code = code.replace(oldBridgeStart + bridgeLogic + oldBridgeEnd, 
        `jsBridge = new AniSyncJSBridge();\n        mainWebView.addJavascriptInterface(jsBridge, "AniSyncBridge");`
    );
    
    code = code.replace(/}\s*$/, 
        `\n    private AniSyncJSBridge jsBridge;\n\n    private class AniSyncJSBridge {\n` + bridgeLogic + `\n    }\n}`
    );
    
    code = code.replace('setupAnimeWebView();', 'setupAnimeWebView();\n        animeWebView.addJavascriptInterface(jsBridge, "AniSyncBridge");');
    
    fs.writeFileSync('packages/mobile/app/src/main/java/com/anisync/mobile/MainActivity.java', code);
    console.log('Refactoring successful');
} else {
    console.log('Bridge logic not found');
}
