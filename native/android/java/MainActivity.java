package id.berangkatin.pilarhub;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/**
 * PILAR Hub untuk Android (HP & IFP).
 * - IFP/tablet (lebar terkecil >= 600dp): dikunci landscape; HP: mengikuti sensor.
 * - Layar penuh imersif, layar tidak mati selama aplikasi terbuka.
 * - Tautan folder ("apps/x/") diarahkan ke "apps/x/index.html".
 * - Element.requestFullscreen() (Mode Panggung dsb.) didukung lewat custom view.
 */
public class MainActivity extends BridgeActivity {
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean large = getResources().getConfiguration().smallestScreenWidthDp >= 600;
        setRequestedOrientation(large ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                                      : ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();

        Bridge bridge = getBridge();
        WebView wv = bridge.getWebView();
        WebSettings s = wv.getSettings();
        s.setMediaPlaybackRequiresUserGesture(false);   // SoundScope, generator nada, video
        s.setTextZoom(100);                             // ukuran huruf sistem tidak merusak tata letak lab
        s.setLoadWithOverviewMode(true);
        wv.setWebViewClient(new PilarClient(bridge));
        wv.setWebChromeClient(new PilarChrome(bridge));
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    private void immersive() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    private static boolean isLocalDir(Uri u) {
        String p = u.getPath();
        return "localhost".equals(u.getHost()) && p != null && p.length() > 1 && p.endsWith("/");
    }

    private class PilarClient extends BridgeWebViewClient {
        PilarClient(Bridge b) { super(b); }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (request.isForMainFrame() && isLocalDir(u)) {
                view.loadUrl(u.buildUpon().path(u.getPath() + "index.html").build().toString());
                return true;
            }
            return super.shouldOverrideUrlLoading(view, request);
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (request.isForMainFrame() && isLocalDir(request.getUrl())) {
                String html = "<!doctype html><meta charset=utf-8><script>location.replace('index.html'+location.search+location.hash)</script>";
                return new WebResourceResponse("text/html", "utf-8", new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8)));
            }
            return super.shouldInterceptRequest(view, request);
        }
    }

    private class PilarChrome extends BridgeWebChromeClient {
        PilarChrome(Bridge b) { super(b); }

        @Override
        public void onShowCustomView(View view, WebChromeClient.CustomViewCallback callback) {
            if (fullView != null) { callback.onCustomViewHidden(); return; }
            fullView = view;
            fullCallback = callback;
            ((FrameLayout) getWindow().getDecorView()).addView(view,
                    new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            immersive();
        }

        @Override
        public void onHideCustomView() {
            if (fullView == null) return;
            ((FrameLayout) getWindow().getDecorView()).removeView(fullView);
            fullView = null;
            if (fullCallback != null) fullCallback.onCustomViewHidden();
            fullCallback = null;
            immersive();
        }
    }
}
