// ═══════════════════════════════════════════════════════════════
// AniSync Common Site Script — Ad Blocker + Popup Blocker
// ES5 compatible for Xiaomi MIUI WebView
// Delivered dynamically from backend, never stored in APK/EXE
// ═══════════════════════════════════════════════════════════════
(function() {
  if (window.__anisync_common_injected) return;
  window.__anisync_common_injected = true;

  // ── Ad Blocker CSS ──
  var s = document.createElement('style');
  s.id = 'anisync-adblock';
  s.textContent =
    '[class*="ad-"],[class*="ads-"],[id*="ad-"],[id*="ads-"],' +
    '[class*="banner"],[class*="popup"],[class*="reklam"],[id*="reklam"],' +
    '.adsbygoogle,ins.adsbygoogle,[class*="AdContainer"],[class*="ad_wrapper"],' +
    'div[data-ad],div[data-ads],iframe[src*="doubleclick"],iframe[src*="googlesyndication"],' +
    '[class*="overlay"]:not(video):not([class*="player"]),' +
    '[class*="modal"]:not([class*="player"]),' +
    'a[target="_blank"][rel*="noopener"]' +
    '{display:none!important;height:0!important;overflow:hidden!important;}';
  document.head.appendChild(s);

  // ── Popup Blocker ──
  window.open = function() { return null; };

  document.addEventListener('click', function(e) {
    var t = e.target;
    if (t && t.tagName === 'A' && t.target === '_blank' && t.href &&
        (t.href.indexOf('ad') > -1 || t.href.indexOf('click') > -1 || t.href.indexOf('track') > -1)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // ── Video Letterbox CSS ──
  var s2 = document.createElement('style');
  s2.id = 'anisync-letterbox';
  s2.textContent = 'video{object-fit:contain!important;max-width:100%!important;max-height:100%!important;}';
  document.head.appendChild(s2);
})();
