# ═══════════════════════════════════════════════════════════════
# AniSync ProGuard Rules
# ═══════════════════════════════════════════════════════════════

# Keep WebView JS Bridge interface methods (called from JavaScript)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the KeepAliveService (referenced in AndroidManifest.xml)
-keep class com.anisync.mobile.KeepAliveService

# Keep MainActivity inner classes used as JS interfaces
-keepclassmembers class com.anisync.mobile.MainActivity$* {
    public *;
}

# WebView
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String);
}

-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, *);
}

# Keep Android framework classes
-keep class androidx.webkit.** { *; }
