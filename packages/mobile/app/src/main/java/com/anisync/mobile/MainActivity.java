package com.anisync.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import androidx.appcompat.app.AppCompatActivity;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "AniSync";
    private static final String SERVER_URL = "https://anisync-server.onrender.com";
    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView mainWebView;
    private WebView animeWebView;
    private LinearLayout rootLayout;
    private boolean animeVisible = false;
    private ValueCallback<Uri[]> fileUploadCallback;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Xiaomi / MIUI detection
    private boolean isXiaomiDevice = false;

    private static final Set<String> AD_DOMAINS = new HashSet<>(Arrays.asList(
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
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Detect Xiaomi / MIUI devices
        isXiaomiDevice = detectXiaomi();
        Log.d(TAG, "Device: " + Build.MANUFACTURER + " " + Build.MODEL + " | Xiaomi: " + isXiaomiDevice);

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
        mainWebView.loadUrl(SERVER_URL);
    }

    /**
     * Creates the anime WebView with Xiaomi-optimized settings.
     * On Xiaomi/MIUI devices:
     * - Uses SOFTWARE layer type instead of HARDWARE (fixes black screen)
     * - Disables hardware-accelerated video overlays
     * - Forces WebView redraw after layout
     */
    private void createAnimeWebView() {
        animeWebView = new WebView(this);
        animeWebView.setBackgroundColor(0xFF000000);
        animeWebView.setVisibility(View.GONE);

        // ── Xiaomi Fix: Use SOFTWARE rendering ──
        // MIUI's custom WebView implementation has bugs with hardware-accelerated
        // rendering that cause black screen when loading external URLs.
        if (isXiaomiDevice) {
            animeWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            Log.d(TAG, "Xiaomi detected — using software rendering for anime WebView");
        } else {
            animeWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }

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
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(true);

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
                        "  if(!v){var fs=document.querySelectorAll('iframe');for(var i=0;i<fs.length;i++){try{v=fs[i].contentDocument.querySelector('video');if(v)break;}catch(e){}}}"
                        +
                        "  if(v){v.currentTime=" + time + ";v.play();}" +
                        "})()";
                break;
            case "pause":
                js = "(function(){" +
                        "  var v = document.querySelector('video');" +
                        "  if(!v){var fs=document.querySelectorAll('iframe');for(var i=0;i<fs.length;i++){try{v=fs[i].contentDocument.querySelector('video');if(v)break;}catch(e){}}}"
                        +
                        "  if(v){v.currentTime=" + time + ";v.pause();}" +
                        "})()";
                break;
            case "seek":
                js = "(function(){" +
                        "  var v = document.querySelector('video');" +
                        "  if(!v){var fs=document.querySelectorAll('iframe');for(var i=0;i<fs.length;i++){try{v=fs[i].contentDocument.querySelector('video');if(v)break;}catch(e){}}}"
                        +
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
                Log.d(TAG, "Anime page loading: " + url);

                // ── Xiaomi Fix: Force WebView to redraw during page load ──
                if (isXiaomiDevice) {
                    forceWebViewRedraw(view);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d(TAG, "Anime page loaded: " + url);

                // Inject ad-blocker CSS
                String adBlockCss = "(function(){" +
                        "var s=document.createElement('style');" +
                        "s.textContent='" +
                        "[class*=\"ad-\"],[class*=\"ads-\"],[id*=\"ad-\"],[id*=\"ads-\"]," +
                        "[class*=\"banner\"],[class*=\"popup\"],[class*=\"reklam\"],[id*=\"reklam\"]," +
                        ".adsbygoogle,ins.adsbygoogle,[class*=\"AdContainer\"],[class*=\"ad_wrapper\"]," +
                        "div[data-ad],div[data-ads],iframe[src*=\"doubleclick\"],iframe[src*=\"googlesyndication\"]," +
                        "[class*=\"overlay\"]:not(video):not([class*=\"player\"])," +
                        "[class*=\"modal\"]:not([class*=\"player\"])," +
                        "a[target=\"_blank\"][rel*=\"noopener\"]" +
                        "{display:none!important;height:0!important;overflow:hidden!important;}';" +
                        "document.head.appendChild(s);" +
                        "})();";
                view.evaluateJavascript(adBlockCss, null);

                String removePopups = "(function(){" +
                        "window.open=function(){return null;};" +
                        "document.addEventListener('click',function(e){" +
                        "  var t=e.target;" +
                        "  if(t.tagName==='A'&&t.target==='_blank'&&t.href&&" +
                        "    (t.href.indexOf('ad')>-1||t.href.indexOf('click')>-1||t.href.indexOf('track')>-1)){" +
                        "    e.preventDefault();e.stopPropagation();" +
                        "  }" +
                        "},true);" +
                        "})();";
                view.evaluateJavascript(removePopups, null);

                // ── Xiaomi Fix: Force redraw after page fully loads ──
                if (isXiaomiDevice) {
                    // Multiple delayed redraws to handle async content
                    mainHandler.postDelayed(() -> forceWebViewRedraw(view), 300);
                    mainHandler.postDelayed(() -> forceWebViewRedraw(view), 1000);
                    mainHandler.postDelayed(() -> forceWebViewRedraw(view), 3000);
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
                Log.e(TAG, "WebView render process gone! Recreating...");
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
            // Allow fullscreen video playback
            private View customView;
            private CustomViewCallback customViewCallback;

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                rootLayout.addView(customView, new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));
                mainWebView.setVisibility(View.GONE);
                animeWebView.setVisibility(View.GONE);

                // Fullscreen flags
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                rootLayout.removeView(customView);
                customViewCallback.onCustomViewHidden();
                customView = null;
                customViewCallback = null;
                mainWebView.setVisibility(View.VISIBLE);
                animeWebView.setVisibility(animeVisible ? View.VISIBLE : View.GONE);

                // Restore system UI
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            }
        });
    }

    /**
     * Force WebView to redraw — fixes Xiaomi/MIUI black screen.
     * Toggles visibility and calls requestLayout+invalidate to force
     * the rendering pipeline to re-render the WebView surface.
     */
    private void forceWebViewRedraw(WebView view) {
        if (view == null || view.getVisibility() != View.VISIBLE) return;

        // Method 1: Invalidate and request layout
        view.requestLayout();
        view.invalidate();

        // Method 2: Toggle visibility (nuclear option for stubborn MIUI)
        mainHandler.postDelayed(() -> {
            if (view.getVisibility() == View.VISIBLE) {
                view.setVisibility(View.INVISIBLE);
                mainHandler.postDelayed(() -> {
                    view.setVisibility(View.VISIBLE);
                    view.requestLayout();
                }, 50);
            }
        }, 100);
    }

    private void loadAnime(String url) {
        Log.d(TAG, "Loading anime: " + url);
        animeVisible = true;
        animeWebView.setVisibility(View.VISIBLE);

        // ── Xiaomi Fix: Set WebView opaque before loading ──
        if (isXiaomiDevice) {
            animeWebView.setBackgroundColor(0xFF000000);
            // Small delay before loading to let layout settle
            mainHandler.postDelayed(() -> {
                animeWebView.loadUrl(url);
                // Force redraw after load starts
                mainHandler.postDelayed(() -> forceWebViewRedraw(animeWebView), 500);
            }, 100);
        } else {
            animeWebView.loadUrl(url);
        }

        applyLayout();
    }

    private void hideAnime() {
        animeVisible = false;
        animeWebView.setVisibility(View.GONE);
        animeWebView.loadUrl("about:blank");
        applyLayout();
    }

    private void applyLayout() {
        rootLayout.removeAllViews();
        boolean isPortrait = getResources().getConfiguration().orientation == Configuration.ORIENTATION_PORTRAIT;
        rootLayout.setOrientation(isPortrait ? LinearLayout.VERTICAL : LinearLayout.HORIZONTAL);

        if (animeVisible) {
            LinearLayout.LayoutParams animeParams;
            LinearLayout.LayoutParams mainParams;
            if (isPortrait) {
                animeParams = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, 0, 6f);
                mainParams = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, 0, 4f);
            } else {
                animeParams = new LinearLayout.LayoutParams(
                        0, LinearLayout.LayoutParams.MATCH_PARENT, 65f);
                mainParams = new LinearLayout.LayoutParams(
                        0, LinearLayout.LayoutParams.MATCH_PARENT, 35f);
            }
            rootLayout.addView(animeWebView, animeParams);
            rootLayout.addView(mainWebView, mainParams);
        } else {
            LinearLayout.LayoutParams fullParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.MATCH_PARENT);
            rootLayout.addView(mainWebView, fullParams);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyLayout();
    }

    private boolean isAdDomain(String host) {
        if (host == null)
            return false;
        for (String ad : AD_DOMAINS) {
            if (host.contains(ad))
                return true;
        }
        return host.contains("ads.") || host.contains(".ad.") || host.contains("tracking.");
    }

    @Override
    public void onBackPressed() {
        if (animeVisible && animeWebView.canGoBack()) {
            animeWebView.goBack();
        } else if (animeVisible) {
            hideAnime();
        } else if (mainWebView.canGoBack()) {
            mainWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mainWebView != null) mainWebView.onResume();
        if (animeWebView != null) animeWebView.onResume();

        // ── Xiaomi Fix: Force redraw when app returns from background ──
        if (isXiaomiDevice && animeVisible && animeWebView != null) {
            mainHandler.postDelayed(() -> forceWebViewRedraw(animeWebView), 300);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mainWebView != null) mainWebView.onPause();
        if (animeWebView != null) animeWebView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (mainWebView != null) {
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
