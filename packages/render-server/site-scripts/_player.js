// ═══════════════════════════════════════════════════════════════
// AniSync Player Script — Video Hook & Sync Bridge
// ES5 compatible for Xiaomi MIUI WebView
// Delivered dynamically from backend, never stored in APK/EXE
// ═══════════════════════════════════════════════════════════════
(function() {
  if (window.__anisync_injected) return;
  window.__anisync_injected = true;
  var ignoreUntil = 0;

  function findVideo() {
    var videos = document.querySelectorAll('video');
    var i;
    for (i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (v.readyState > 0 || v.src || v.currentSrc) {
        hookVideo(v);
        return true;
      }
    }
    // Also check for any video element even without src
    if (videos.length > 0) {
      hookVideo(videos[0]);
      return true;
    }
    return false;
  }

  function hookVideo(v) {
    window.__anisync_has_video = true;
    window.__anisync_api = {
      play: function() { ignoreUntil = Date.now() + 1000; v.play(); },
      pause: function() { ignoreUntil = Date.now() + 1000; v.pause(); },
      seek: function(t) { ignoreUntil = Date.now() + 1000; v.currentTime = t; },
      getTime: function() { return v.currentTime || 0; },
      getDuration: function() { return v.duration || 0; },
      getState: function() { return v.paused ? 'paused' : 'playing'; },
      getEvent: function() { var e = window.__anisync_event; window.__anisync_event = null; return e; },
      hasVideo: true
    };

    v.addEventListener('play', function() {
      if (Date.now() < ignoreUntil) return;
      var ev = { type: 'play', time: v.currentTime, ts: Date.now() };
      window.__anisync_event = ev;
      // Push to Android bridge if available
      if (window.AniSyncBridge && window.AniSyncBridge.pushEvent) {
        try { window.AniSyncBridge.pushEvent(JSON.stringify(ev)); } catch(e) {}
      }
    });
    v.addEventListener('pause', function() {
      if (Date.now() < ignoreUntil) return;
      var ev = { type: 'pause', time: v.currentTime, ts: Date.now() };
      window.__anisync_event = ev;
      if (window.AniSyncBridge && window.AniSyncBridge.pushEvent) {
        try { window.AniSyncBridge.pushEvent(JSON.stringify(ev)); } catch(e) {}
      }
    });
    v.addEventListener('seeked', function() {
      if (Date.now() < ignoreUntil) return;
      var ev = { type: 'seek', time: v.currentTime, ts: Date.now() };
      window.__anisync_event = ev;
      if (window.AniSyncBridge && window.AniSyncBridge.pushEvent) {
        try { window.AniSyncBridge.pushEvent(JSON.stringify(ev)); } catch(e) {}
      }
    });

    // Watch for video element being replaced (SPA navigation)
    setInterval(function() {
      if (!document.body.contains(v)) {
        window.__anisync_injected = false;
        window.__anisync_has_video = false;
        window.__anisync_api = null;
        if (!findVideo()) { startSearch(); }
      }
    }, 3000);
  }

  function startSearch() {
    var attempts = 0;
    var pi = setInterval(function() {
      attempts++;
      if (findVideo()) { clearInterval(pi); return; }
      if (attempts > 120) { clearInterval(pi); }
    }, 1000);
    try {
      var o = new MutationObserver(function() { if (findVideo()) { o.disconnect(); } });
      o.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch(e) {}
  }

  if (!findVideo()) { startSearch(); }
})();
