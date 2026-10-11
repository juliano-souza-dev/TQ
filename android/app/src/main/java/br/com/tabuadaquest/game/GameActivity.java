package br.com.tabuadaquest.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.ScrollView;
import android.widget.TextView;
import android.util.Log;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Native Android shell for the complete local TQ web game.
 *
 * Landscape immersive WebGL2/Canvas, with a private HTTPS origin serving
 * assets inside the APK. The stable virtual origin preserves localStorage
 * progress between launches and normally signed application upgrades.
 */
public final class GameActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String GAME_URL = "https://" + APP_HOST + "/index.html";

    private WebView gameView;
    private static final String LOG_TAG = "TabuadaQuestAndroid";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        // Window decor may not exist yet during Activity.onCreate.
        // Apply immersive mode only after setContentView attaches a decor view.

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain(APP_HOST)
            .addPathHandler("/", path -> openBundledAsset(path))
            .build();

        gameView = new WebView(this);
        gameView.setBackgroundColor(Color.rgb(8, 26, 51));
        gameView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        gameView.setHorizontalScrollBarEnabled(false);
        gameView.setVerticalScrollBarEnabled(false);

        WebSettings settings = gameView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        gameView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equalsIgnoreCase(url.getScheme()) && APP_HOST.equalsIgnoreCase(url.getHost())) {
                    return false;
                }
                String scheme = url.getScheme();
                if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
                    return true;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (ActivityNotFoundException ignored) {
                    // The game itself remains open when no browser is installed.
                }
                return true;
            }
        });
        gameView.setWebChromeClient(new WebChromeClient());

        setContentView(gameView);
        showImmersive();
        if (savedInstanceState != null) {
            // Reload bundled source, never a stale in-memory WebView history.
            gameView.clearHistory();
        }
        gameView.loadUrl(GAME_URL);
        } catch (Throwable startupFailure) {
            Log.e(LOG_TAG, "Android startup failed", startupFailure);
            showStartupError(startupFailure);
        }
    }

    private void showStartupError(Throwable failure) {
        try {
            if (gameView != null) {
                gameView.stopLoading();
                gameView.destroy();
                gameView = null;
            }
            TextView message = new TextView(this);
            message.setTextColor(Color.WHITE);
            message.setBackgroundColor(Color.rgb(8, 26, 51));
            message.setTextSize(16);
            message.setPadding(32, 32, 32, 32);
            String detail = failure.getClass().getName() + ": " + String.valueOf(failure.getMessage());
            message.setText("Tabuada Quest: falha ao iniciar.\n\n" + detail +
                "\n\nEnvie uma captura desta tela para corrigirmos o problema.\n" +
                "Os dados locais do jogo nao foram apagados.");
            ScrollView scroll = new ScrollView(this);
            scroll.addView(message);
            setContentView(scroll);
        } catch (Throwable fallbackFailure) {
            Log.e(LOG_TAG, "Could not display startup error", fallbackFailure);
        }
    }

    private WebResourceResponse openBundledAsset(String path) {
        if (path == null) return null;
        String safe = path.startsWith("/") ? path.substring(1) : path;
        if (safe.isEmpty()) safe = "index.html";
        // Strictly keep requests inside the packaged www tree.
        if (safe.contains("..") || safe.contains("\\") || safe.indexOf((char) 0) >= 0) {
            return null;
        }
        try {
            InputStream stream = getAssets().open("www/" + safe);
            WebResourceResponse response = new WebResourceResponse(contentType(safe), "UTF-8", stream);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-store, no-cache, must-revalidate");
            headers.put("X-Content-Type-Options", "nosniff");
            response.setResponseHeaders(headers);
            return response;
        } catch (IOException ignored) {
            return null; // A genuine 404, not a silent empty JavaScript module.
        }
    }

    private static String contentType(String path) {
        String file = path.toLowerCase(Locale.ROOT);
        if (file.endsWith(".js") || file.endsWith(".mjs")) return "text/javascript";
        if (file.endsWith(".html")) return "text/html";
        if (file.endsWith(".css")) return "text/css";
        if (file.endsWith(".json") || file.endsWith(".webmanifest")) return "application/json";
        if (file.endsWith(".webp")) return "image/webp";
        if (file.endsWith(".png")) return "image/png";
        if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
        if (file.endsWith(".gif")) return "image/gif";
        if (file.endsWith(".svg")) return "image/svg+xml";
        if (file.endsWith(".mp3")) return "audio/mpeg";
        if (file.endsWith(".ogg")) return "audio/ogg";
        if (file.endsWith(".wav")) return "audio/wav";
        if (file.endsWith(".mp4")) return "video/mp4";
        if (file.endsWith(".webm")) return "video/webm";
        if (file.endsWith(".woff2")) return "font/woff2";
        if (file.endsWith(".woff")) return "font/woff";
        if (file.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    private void showImmersive() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = window.getAttributes();
            params.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(params);
        }
        View decor = window.peekDecorView();
        if (decor == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = decor.getWindowInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) showImmersive();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        showImmersive();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (gameView != null) gameView.onResume();
        showImmersive();
    }

    @Override
    protected void onPause() {
        if (gameView != null) gameView.onPause();
        super.onPause();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        new AlertDialog.Builder(this)
            .setTitle("Sair do Tabuada Quest?")
            .setMessage("O progresso local fica salvo neste aparelho.")
            .setNegativeButton("Continuar jogando", (dialog, which) -> showImmersive())
            .setPositiveButton("Sair", (dialog, which) -> finish())
            .show();
    }

    @Override
    protected void onDestroy() {
        if (gameView != null) {
            gameView.stopLoading();
            gameView.destroy();
            gameView = null;
        }
        super.onDestroy();
    }
}
