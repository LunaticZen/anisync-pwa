package com.anisync.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.http.SslError;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayInputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "AniSync";
    private static final String SERVER_URL = "https://anisync-9z1z.onrender.com";
    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView mainWebView;
    private WebView animeWebView;
    private LinearLayout rootLayout;
    private FrameLayout frameContainer; // Reused across rotations to prevent black screen
    private boolean animeVisible = false;
    private ValueCallback<Uri[]> fileUploadCallback;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ── Fullscreen video tracking (activity-level so onConfigurationChanged can check) ──
    private View fullscreenCustomView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;

    // ── Redraw debounce: prevent postDelayed accumulation ──
    private final Runnable pendingRedraw = () -> {
        if (animeVisible && animeWebView != null) forceWebViewRedraw(animeWebView);
        if (mainWebView != null) forceWebViewRedraw(mainWebView);
    };
    private final Runnable pendingAnimeRedraw = () -> {
        if (animeWebView != null && animeVisible) forceWebViewRedraw(animeWebView);
    };

    // ── Page load counter for memory management ──
    private int animePageLoadCount = 0;

    // Xiaomi / MIUI detection
    private boolean isXiaomiDevice = false;

    // ── Log Buffer ──
    private static final int MAX_LOG_ENTRIES = 300;
    private static final List<String> logBuffer = new ArrayList<>();
    private static final SimpleDateFormat LOG_TIME_FMT = new SimpleDateFormat("HH:mm:ss.SSS", Locale.US);

    private void appLog(String msg) {
        String entry = LOG_TIME_FMT.format(new Date()) + " " + msg;
        synchronized (logBuffer) {
            logBuffer.add(entry);
            if (logBuffer.size() > MAX_LOG_ENTRIES) logBuffer.remove(0);
        }
        Log.d(TAG, msg);
    }

    private void appLogError(String msg) {
        String entry = LOG_TIME_FMT.format(new Date()) + " [ERROR] " + msg;
        synchronized (logBuffer) {
            logBuffer.add(entry);
            if (logBuffer.size() > MAX_LOG_ENTRIES) logBuffer.remove(0);
        }
        Log.e(TAG, msg);
    }

    // ── Ad domain set: used for suffix-based matching ──
    private static final Set<String> AD_DOMAIN_SUFFIXES = new HashSet<>(Arrays.asList(
            "doubleclick.net", "googlesyndication.com", "googleadservices.com",
            "google-analytics.com", "adservice.google.com",
            "facebook.net", "fbcdn.net",
            "amazon-adsystem.com", "ads-twitter.com",
            "adnxs.com", "adsrvr.org", "adcolony.com",
            "moatads.com", "serving-sys.com",
            "popads.net", "popcash.net", "propellerads.com",
            "exoclick.com", "juicyads.com",
            "revcontent.com", "taboola.com", "outbrain.com",
            "mgid.com", "content-ad.net",
            "betweendigital.com", "bidvertiser.com",
            "pushground.com", "trafficstars.com", "clickadu.com",
            "hilltopads.net", "a-ads.com", "adsterra.com",
            "vidmoly.me", "vidmoly.to",
            "turkanime.co", "hdvid.fun", "streamtape.com",
            "mixdrop.co", "dooood.com", "upstream.to",
            "apexsec.co", "cpmstar.com", "ad-maven.com",
            "admaven.com", "monetag.com", "onclicka.com",
            "onclicksuper.com", "highcpmgate.com",
            "disqus.com", "yandex.ru", "mc.yandex.ru"));

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // PERF: FLAG_KEEP_SCREEN_ON removed from here — now only set during video playback
        // to prevent battery drain when user is just chatting or on home screen.

        // Detect Xiaomi / MIUI devices
        isXiaomiDevice = detectXiaomi();
        appLog("Device: " + Build.MANUFACTURER + " " + Build.MODEL + " | Xiaomi: " + isXiaomiDevice);

        // PERF: KeepAliveService removed from onCreate — now started/stopped via JS Bridge
        // when user joins/leaves a room. Prevents unnecessary foreground service when idle.

        rootLayout = new LinearLayout(this);
        rootLayout.setBackgroundColor(0xFF050816);

        // ── Main WebView (UI) ──
        mainWebView = new WebView(this);
        mainWebView.setBackgroundColor(0xFF050816);
        setupMainWebView();

        // ── Anime WebView (video player) — lazy init for Xiaomi ──
        createAnimeWebView();

        applyLayout();
        setContentView(rootLayout);
        mainWebView.loadUrl(SERVER_URL + "?v=" + System.currentTimeMillis());
    }

    /**
     * Creates the anime WebView with video-optimized settings.
     * Previously used LAYER_TYPE_SOFTWARE on Xiaomi which BROKE video rendering
     * (video uses hardware-decoded SurfaceView, SOFTWARE mode can't render it).
     * Now uses LAYER_TYPE_NONE (default) which allows hardware video surfaces.
     */
    private void createAnimeWebView() {
        animeWebView = new WebView(this);
        animeWebView.setBackgroundColor(0xFF000000);
        animeWebView.setVisibility(View.GONE);

        // Use NONE layer type — allows hardware video surfaces to render
        // SOFTWARE was causing the black screen because it can't render
        // hardware-decoded video SurfaceViews
        animeWebView.setLayerType(View.LAYER_TYPE_NONE, null);
        appLog("Anime WebView layer: NONE (allows HW video surfaces)");

        setupAnimeWebView();
    }

    /**
     * Detect Xiaomi / MIUI / Redmi / POCO devices
     */
    private boolean detectXiaomi() {
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        String brand = Build.BRAND.toLowerCase();
        return manufacturer.contains("xiaomi") || manufacturer.contains("redmi") ||
               manufacturer.contains("poco") || brand.contains("xiaomi") ||
               brand.contains("redmi") || brand.contains("poco");
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupMainWebView() {
        WebSettings s = mainWebView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);  // Always fetch latest from server
        s.setAllowFileAccess(true);

        // ── Block MIUI Force Dark Mode injection ──
        // MIUI injects its own dark theme CSS into WebViews, corrupting our themed UI.
        // This disables it at the WebView level.
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                WebSettingsCompat.setForceDark(s, WebSettingsCompat.FORCE_DARK_OFF);
                appLog("Force Dark Mode disabled for mainWebView");
            }
        } catch (Exception e) {
            appLogError("Force Dark Mode disable failed: " + e.getMessage());
        }

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(mainWebView, true);

        // JS Bridge
        mainWebView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void openAnime(String url) {
                runOnUiThread(() -> loadAnime(url));
            }

            @JavascriptInterface
            public void closeAnime() {
                runOnUiThread(() -> hideAnime());
            }

            @JavascriptInterface
            public void controlAnime(String command, double time) {
                runOnUiThread(() -> executeVideoCommand(command, time));
            }

            // PERF: KeepAliveService lifecycle — start when joining room, stop when leaving
            @JavascriptInterface
            public void startKeepAlive() {
                runOnUiThread(() -> {
                    try {
                        Intent i = new Intent(MainActivity.this, KeepAliveService.class);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(i);
                        } else {
                            startService(i);
                        }
                        appLog("KeepAliveService started (room joined)");
                    } catch (Exception e) {
                        appLogError("KeepAliveService start failed: " + e.getMessage());
                    }
                });
            }

            @JavascriptInterface
            public void stopKeepAlive() {
                runOnUiThread(() -> {
                    try {
                        stopService(new Intent(MainActivity.this, KeepAliveService.class));
                        appLog("KeepAliveService stopped (room left)");
                    } catch (Exception e) {
                        appLogError("KeepAliveService stop failed: " + e.getMessage());
                    }
                });
            }

            @JavascriptInterface
            public String getLogs() {
                StringBuilder sb = new StringBuilder();
                sb.append("=== AniSync Logs ===").append("\n");
                sb.append("Device: ").append(Build.MANUFACTURER).append(" ").append(Build.MODEL).append("\n");
                sb.append("Android: ").append(Build.VERSION.RELEASE).append(" (SDK ").append(Build.VERSION.SDK_INT).append("\n");
                sb.append("Xiaomi: ").append(isXiaomiDevice).append("\n");
                sb.append("===================").append("\n\n");
                synchronized (logBuffer) {
                    for (String line : logBuffer) {
                        sb.append(line).append("\n");
                    }
                }
                return sb.toString();
            }

            @JavascriptInterface
            public void copyLogs() {
                String logs = getLogs();
                runOnUiThread(() -> {
                    ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    ClipData clip = ClipData.newPlainText("AniSync Logs", logs);
                    clipboard.setPrimaryClip(clip);
                    appLog("Logs copied to clipboard (" + logBuffer.size() + " entries)");
                });
            }
        }, "AniSyncBridge");

        mainWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!url.contains("anisync") && !url.contains("onrender.com") && !url.startsWith("about:")) {
                    loadAnime(url);
                    return true;
                }
                return false;
            }
        });

        // File chooser for gallery upload (profile picture)
        mainWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(intent, "Fotoğraf seç"), FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[] { Uri.parse(dataString) };
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
    }

    private void executeVideoCommand(String command, double time) {
        if (animeWebView == null || !animeVisible)
            return;

        String js;
        switch (command) {
            case "play":
                js = "(function(){" +
                        "  var v = document.querySelector('video');" +
                        "  if(!v){var fs=document.querySelectorAll('iframe');for(var i=0;i<fs.length;i++){try{v=fs[i].contentDocument.querySelector('video');if(v)break;}catch(e){}}}" +
                        "  if(v){v.currentTime=" + time + ";v.play();}" +
                        "})()";
                break;
            case "pause":
                js = "(function(){" +
                        "  var v = document.querySelector('video');" +
                        "  if(!v){var fs=document.querySelectorAll('iframe');for(var i=0;i<fs.length;i++){try{v=fs[i].contentDocument.querySelector('video');if(v)break;}catch(e){}}}" +
                        "  if(v){v.currentTime=" + time + ";v.pause();}" +
                        "})()";
                break;
            case "seek":
                js = "(function(){" +
                        "  var v = document.querySelector('video');" +
                        "  if(!v){var fs=document.querySelectorAll('iframe');for(var i=0;i<fs.length;i++){try{v=fs[i].contentDocument.querySelector('video');if(v)break;}catch(e){}}}" +
                        "  if(v){v.currentTime=" + time + ";}" +
                        "})()";
                break;
            default:
                return;
        }
        animeWebView.evaluateJavascript(js, null);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupAnimeWebView() {
        WebSettings s = animeWebView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        s.setAllowContentAccess(true);
        s.setAllowFileAccess(true);

        // Video performance tweaks
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setBlockNetworkImage(false);
        s.setLoadsImagesAutomatically(true);

        s.setUserAgentString(
                "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(animeWebView, true);

        animeWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                appLog("Anime page loading: " + url);

                // Force WebView redraw during page load
                forceWebViewRedraw(view);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                appLog("Anime page loaded: " + url);

                // Track page loads for periodic memory cleanup
                animePageLoadCount++;

                // PERF: All JS injections consolidated into single evaluateJavascript call
                // to reduce IPC overhead. Guard flag prevents duplicate injection.
                // MutationObserver REMOVED — CSS !important handles all video elements.
                String allInjects = "(function(){" +
                        "if(window.__anisyncInjected)return;" +
                        "window.__anisyncInjected=true;" +
                        // Ad-blocker CSS
                        "var s=document.createElement('style');" +
                        "s.id='anisync-adblock';" +
                        "s.textContent='" +
                        "[class*=\\\"ad-\\\"],[class*=\\\"ads-\\\"],[id*=\\\"ad-\\\"],[id*=\\\"ads-\\\"]," +
                        "[class*=\\\"banner\\\"],[class*=\\\"popup\\\"],[class*=\\\"reklam\\\"],[id*=\\\"reklam\\\"]," +
                        ".adsbygoogle,ins.adsbygoogle,[class*=\\\"AdContainer\\\"],[class*=\\\"ad_wrapper\\\"]," +
                        "div[data-ad],div[data-ads],iframe[src*=\\\"doubleclick\\\"],iframe[src*=\\\"googlesyndication\\\"]," +
                        "[class*=\\\"overlay\\\"]:not(video):not([class*=\\\"player\\\"])," +
                        "[class*=\\\"modal\\\"]:not([class*=\\\"player\\\"])," +
                        "a[target=\\\"_blank\\\"][rel*=\\\"noopener\\\"]" +
                        "{display:none!important;height:0!important;overflow:hidden!important;}';" +
                        "document.head.appendChild(s);" +
                        // Popup blocker
                        "window.open=function(){return null;};" +
                        "document.addEventListener('click',function(e){" +
                        "  var t=e.target;" +
                        "  if(t.tagName==='A'&&t.target==='_blank'&&t.href&&" +
                        "    (t.href.indexOf('ad')>-1||t.href.indexOf('click')>-1||t.href.indexOf('track')>-1)){" +
                        "    e.preventDefault();e.stopPropagation();" +
                        "  }" +
                        "},true);" +
                        // Video letterbox CSS (no MutationObserver — CSS !important is sufficient)
                        "var s2=document.createElement('style');" +
                        "s2.id='anisync-letterbox';" +
                        "s2.textContent='video{object-fit:contain!important;max-width:100%!important;max-height:100%!important;}';" +
                        "document.head.appendChild(s2);" +
                        "})();";
                view.evaluateJavascript(allInjects, null);

                // Debounced redraw — cancel previous pending redraws first
                mainHandler.removeCallbacks(pendingRedraw);
                mainHandler.removeCallbacks(pendingAnimeRedraw);
                mainHandler.postDelayed(pendingAnimeRedraw, 500);
            }

            // ── VPN/SSL Fix: Proton VPN & Cloudflare WARP re-sign SSL certs ──
            // Xiaomi WebView silently rejects these modified certs → black screen.
            // Samsung's WebView is more lenient. For anime content, strict SSL is unnecessary.
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                appLog("SSL error (proceeding): " + error.getPrimaryError() + " url=" + error.getUrl());
                handler.proceed(); // Accept the VPN-modified certificate
            }

            // ── Network error handler: log errors and attempt reload for transient failures ──
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                appLogError("WebView error [" + errorCode + "]: " + description + " url=" + failingUrl);
                // Auto-retry once for common VPN-related transient errors
                if (errorCode == WebViewClient.ERROR_CONNECT ||
                    errorCode == WebViewClient.ERROR_TIMEOUT ||
                    errorCode == WebViewClient.ERROR_HOST_LOOKUP) {
                    appLog("VPN transient error, retrying in 2s...");
                    mainHandler.postDelayed(() -> {
                        if (animeVisible && view != null) {
                            view.reload();
                        }
                    }, 2000);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                if (isAdDomain(host))
                    return true;
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                if (isAdDomain(host)) {
                    return new WebResourceResponse("text/plain", "utf-8",
                            new ByteArrayInputStream("".getBytes()));
                }
                String path = request.getUrl().getPath();
                if (path != null && (path.contains("/ads/") || path.contains("/ad/") ||
                        path.contains("/banner") || path.contains("/popup"))) {
                    return new WebResourceResponse("text/plain", "utf-8",
                            new ByteArrayInputStream("".getBytes()));
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // ── WebView crash recovery ──
                // Xiaomi devices sometimes kill the WebView render process
                appLogError("WebView render process gone! Recreating...");
                if (view == animeWebView) {
                    rootLayout.removeView(animeWebView);
                    animeWebView.destroy();
                    createAnimeWebView();
                    if (animeVisible) {
                        applyLayout();
                    }
                    return true; // We handled it
                }
                return false;
            }
        });

        animeWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenCustomView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullscreenCustomView = view;
                fullscreenCallback = callback;

                // ── Danmaku Fix: mainWebView'ı gizlemek yerine fullscreen video
                // ── üstüne transparan overlay olarak yerleştir
                // Detach mainWebView from current parent
                if (mainWebView.getParent() != null) {
                    ((ViewGroup) mainWebView.getParent()).removeView(mainWebView);
                }
                animeWebView.setVisibility(View.GONE);

                // FrameLayout: fullscreen video altta, mainWebView şeffaf overlay üstte
                FrameLayout fsContainer = new FrameLayout(MainActivity.this);
                fsContainer.addView(fullscreenCustomView, new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));

                mainWebView.setBackgroundColor(0x00000000); // Transparent
                if (isXiaomiDevice) {
                    mainWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
                }
                fsContainer.addView(mainWebView, new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));

                rootLayout.removeAllViews();
                rootLayout.addView(fsContainer, new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.MATCH_PARENT));

                // ── Touch Forwarding: mainWebView sadece danmaku render eder,
                // ── tüm dokunmatik olayları alttaki video player'a iletir
                mainWebView.setOnTouchListener((v, event) -> {
                    if (fullscreenCustomView != null) {
                        fullscreenCustomView.dispatchTouchEvent(event);
                        return true; // Consumed by forwarding, WebView kendi touch'ını işlemez
                    }
                    return false; // Normal WebView davranışı
                });

                // React'e fullscreen sinyali gönder
                mainHandler.postDelayed(() -> mainWebView.evaluateJavascript(
                    "window.__anisyncSetFullscreen && window.__anisyncSetFullscreen(true)", null), 100);

                // Fullscreen flags
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
                appLog("Fullscreen video started (danmaku overlay + touch forwarding active)");
            }

            @Override
            public void onHideCustomView() {
                if (fullscreenCustomView == null) return;

                // Detach mainWebView from fullscreen container
                if (mainWebView.getParent() != null) {
                    ((ViewGroup) mainWebView.getParent()).removeView(mainWebView);
                }

                rootLayout.removeAllViews();
                fullscreenCallback.onCustomViewHidden();
                fullscreenCustomView = null;
                fullscreenCallback = null;

                // Normal layout'a geri dön
                animeWebView.setVisibility(animeVisible ? View.VISIBLE : View.GONE);

                // Touch forwarding'i kaldır — normal WebView davranışına dön
                mainWebView.setOnTouchListener(null);

                applyLayout();

                // Xiaomi: staged redraws after fullscreen exit to prevent black screen
                if (isXiaomiDevice) {
                    mainHandler.postDelayed(pendingRedraw, 200);
                    mainHandler.postDelayed(pendingAnimeRedraw, 500);
                    mainHandler.postDelayed(pendingRedraw, 1000);
                }

                // React'e fullscreen bitti sinyali
                mainWebView.evaluateJavascript(
                    "window.__anisyncSetFullscreen && window.__anisyncSetFullscreen(false)", null);

                // Restore system UI
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
                appLog("Fullscreen video ended (normal layout restored)");
            }
        });
    }

    /**
     * Force WebView to redraw — workaround for rendering glitches.
     * Xiaomi MIUI requires JS opacity poke to trigger Chromium compositor repaint
     * after layer-type or layout changes. Non-Xiaomi uses native invalidate only.
     */
    private void forceWebViewRedraw(WebView view) {
        if (view == null || view.getVisibility() != View.VISIBLE) return;
        view.requestLayout();
        view.invalidate();
        // Xiaomi: native invalidate alone doesn't trigger visual update after
        // layer type switches. The CSS opacity change forces Chromium to repaint.
        if (isXiaomiDevice) {
            view.evaluateJavascript(
                "(function(){" +
                "  document.body.style.opacity='0.999';" +
                "  setTimeout(function(){document.body.style.opacity='1';},50);" +
                "})()", null);
        }
    }

    private void loadAnime(String url) {
        appLog("Loading anime: " + url);
        animeVisible = true;
        animeWebView.setVisibility(View.VISIBLE);

        // PERF: Keep screen on only during video playback
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // ── Clear previous page resources before loading new URL ──
        animeWebView.clearHistory();

        // Periodic deeper cleanup every 5 page loads
        if (animePageLoadCount > 0 && animePageLoadCount % 5 == 0) {
            animeWebView.clearCache(false); // false = don't delete disk cache files
            appLog("Periodic WebView cache trim (page load #" + animePageLoadCount + ")");
        }

        // ── Load anime URL ──
        animeWebView.loadUrl(url);

        // Debounced redraw — cancel any pending ones first
        mainHandler.removeCallbacks(pendingRedraw);
        mainHandler.removeCallbacks(pendingAnimeRedraw);
        mainHandler.postDelayed(pendingAnimeRedraw, 1500);

        applyLayout();
    }

    private void hideAnime() {
        animeVisible = false;
        animeWebView.setVisibility(View.GONE);
        animeWebView.loadUrl("about:blank");

        // PERF: Allow screen to sleep when not watching video
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        applyLayout();
    }

    private void applyLayout() {
        // Detach views from any existing parent first
        if (mainWebView.getParent() != null) {
            ((android.view.ViewGroup) mainWebView.getParent()).removeView(mainWebView);
        }
        if (animeWebView.getParent() != null) {
            ((android.view.ViewGroup) animeWebView.getParent()).removeView(animeWebView);
        }
        // Remove frameContainer from rootLayout if present
        if (frameContainer != null && frameContainer.getParent() != null) {
            ((android.view.ViewGroup) frameContainer.getParent()).removeView(frameContainer);
        }
        rootLayout.removeAllViews();

        boolean isPortrait = getResources().getConfiguration().orientation == Configuration.ORIENTATION_PORTRAIT;

        if (animeVisible) {
            if (isPortrait) {
                // PORTRAIT: Anime top (60%), Main bottom (40%) — vertical stack
                rootLayout.setOrientation(LinearLayout.VERTICAL);
                rootLayout.addView(animeWebView, new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, 0, 6f));
                mainWebView.setBackgroundColor(0xFF050816);
                // Reset mainWebView to hardware rendering in portrait
                mainWebView.setLayerType(View.LAYER_TYPE_NONE, null);
                rootLayout.addView(mainWebView, new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, 0, 4f));
            } else {
                // LANDSCAPE: Anime full screen, Main WebView overlaid (transparent for ticker)
                rootLayout.setOrientation(LinearLayout.VERTICAL);
                // Reuse FrameLayout to prevent black screen on rotation
                if (frameContainer == null) {
                    frameContainer = new FrameLayout(this);
                }
                frameContainer.removeAllViews();
                frameContainer.addView(animeWebView, new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));
                mainWebView.setBackgroundColor(0x00000000); // Transparent
                // Xiaomi fix: software-render the transparent overlay WebView
                // so MIUI compositor can composite it over hardware video surface.
                // Samsung handles dual-HW-WebView overlay fine, Xiaomi cannot.
                if (isXiaomiDevice) {
                    mainWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
                    appLog("Landscape Xiaomi: mainWebView → SOFTWARE layer");
                } else {
                    mainWebView.setLayerType(View.LAYER_TYPE_NONE, null);
                }
                frameContainer.addView(mainWebView, new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));
                rootLayout.addView(frameContainer, new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.MATCH_PARENT));
            }
        } else {
            rootLayout.setOrientation(LinearLayout.VERTICAL);
            mainWebView.setBackgroundColor(0xFF050816);
            // Reset mainWebView to hardware rendering when anime is off
            mainWebView.setLayerType(View.LAYER_TYPE_NONE, null);
            rootLayout.addView(mainWebView, new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.MATCH_PARENT));
        }

        // Force layout pass
        rootLayout.requestLayout();
        rootLayout.invalidate();
        // Debounced redraw for slow rendering devices — cancel previous first
        mainHandler.removeCallbacks(pendingRedraw);
        mainHandler.postDelayed(pendingRedraw, 300);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        // ── Skip layout changes during fullscreen video playback ──
        // applyLayout() calls rootLayout.removeAllViews() which destroys
        // the fullscreen customView, causing black screen on Xiaomi.
        if (fullscreenCustomView != null) {
            appLog("Orientation changed during fullscreen — skipping applyLayout");
            // Just re-apply immersive flags (they can reset on rotation)
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            return;
        }

        applyLayout();

        // Notify web layer of orientation change via JS bridge
        boolean isPortrait = newConfig.orientation == Configuration.ORIENTATION_PORTRAIT;
        mainHandler.postDelayed(() -> {
            if (mainWebView != null) {
                mainWebView.evaluateJavascript(
                    "window.__anisyncSetOrientation && window.__anisyncSetOrientation(" + isPortrait + ")",
                    null);
            }
        }, 100);

        // Redraws after orientation change — Xiaomi needs staged redraws
        // because MIUI compositor wakes up slowly after rotation
        if (animeVisible) {
            mainHandler.removeCallbacks(pendingRedraw);
            mainHandler.removeCallbacks(pendingAnimeRedraw);
            if (isXiaomiDevice) {
                // Xiaomi: 3 staged redraws required — single redraw causes black screen
                mainHandler.postDelayed(pendingRedraw, 200);
                mainHandler.postDelayed(pendingAnimeRedraw, 600);
                mainHandler.postDelayed(pendingRedraw, 1200);
            } else {
                mainHandler.postDelayed(pendingRedraw, 500);
            }
        }
    }

    /**
     * Optimized ad-domain check using suffix matching instead of O(N) contains loop.
     * Splits host into domain suffixes and checks HashSet membership.
     */
    private boolean isAdDomain(String host) {
        if (host == null || host.isEmpty())
            return false;
        // Quick prefix checks for common ad patterns
        if (host.startsWith("ads.") || host.startsWith("ad.") || host.startsWith("tracking."))
            return true;
        // Suffix matching: check "host", then "parent.host", etc.
        String domain = host;
        while (domain.contains(".")) {
            if (AD_DOMAIN_SUFFIXES.contains(domain))
                return true;
            int dot = domain.indexOf('.');
            domain = domain.substring(dot + 1);
        }
        return false;
    }

    @Override
    public void onBackPressed() {
        if (animeVisible && animeWebView.canGoBack()) {
            animeWebView.goBack();
        } else if (mainWebView != null) {
            // Tarayıcı geçmişinde geri gitmek (goBack) siyah ekrana sebep oluyor.
            // Bunun yerine arayüze özel bir sinyal (Event) gönderiyoruz:
            mainWebView.evaluateJavascript("window.dispatchEvent(new Event('hardwareBackPress'));", null);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // PERF: Resume timers before onResume so JS execution restarts
        if (mainWebView != null) {
            mainWebView.resumeTimers();
            mainWebView.onResume();
        }
        if (animeWebView != null) animeWebView.onResume();

        // ── Xiaomi Fix: Force redraw when app returns from background ──
        if (isXiaomiDevice && animeVisible && animeWebView != null) {
            mainHandler.removeCallbacks(pendingAnimeRedraw);
            mainHandler.postDelayed(pendingAnimeRedraw, 300);
        }

        // ── Check if room is still active after returning from background ──
        if (animeVisible && mainWebView != null) {
            mainHandler.postDelayed(() -> {
                mainWebView.evaluateJavascript(
                    "(function(){ try { return window.__anisyncRoomActive ? 'active' : 'inactive'; } catch(e) { return 'inactive'; } })()",
                    result -> {
                        if (result != null && result.contains("inactive")) {
                            appLog("Room no longer active after resume, hiding anime");
                            runOnUiThread(() -> hideAnime());
                        }
                    }
                );
            }, 1500);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mainWebView != null) {
            mainWebView.onPause();
            // PERF: Pause JS timers to stop setInterval/setTimeout in background
            // This stops heartbeat, drift check, and CSS animations from running
            mainWebView.pauseTimers();
        }
        if (animeWebView != null) {
            animeWebView.onPause();
            // Note: NOT pausing animeWebView timers — video playback may continue
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        // When app is being finished (back button or swipe from recents),
        // force leave room and disconnect socket immediately
        if (isFinishing() && mainWebView != null) {
            appLog("App finishing - forcing room leave and socket disconnect");
            mainWebView.evaluateJavascript(
                "(function(){" +
                "  try {" +
                "    var stores = window.__zustandStores;" +
                "    if(window.__anisyncForceLeave) window.__anisyncForceLeave();" +
                "  } catch(e){}" +
                "})()", null);
        }
    }

    @Override
    protected void onDestroy() {
        // PERF: Stop KeepAliveService on destroy
        try {
            stopService(new Intent(this, KeepAliveService.class));
        } catch (Exception ignored) {}

        // Force leave room via JS before destroying WebViews
        if (mainWebView != null) {
            appLog("onDestroy - forcing room leave");
            mainWebView.evaluateJavascript(
                "(function(){" +
                "  try { if(window.__anisyncForceLeave) window.__anisyncForceLeave(); } catch(e){}" +
                "})()", null);
            // Small delay to let the emit go through before destroying
            try { Thread.sleep(100); } catch (InterruptedException ignored) {}
            mainWebView.destroy();
            mainWebView = null;
        }
        if (animeWebView != null) {
            animeWebView.destroy();
            animeWebView = null;
        }
        super.onDestroy();
    }
}
