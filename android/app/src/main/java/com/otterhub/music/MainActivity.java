package com.otterhub.music;

import static androidx.core.view.WindowCompat.enableEdgeToEdge;

import android.content.res.Configuration;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

/**
 * MainActivity — 支持 Android TV 遥控器
 *
 * TV 遥控器的方向键 / 媒体键默认被 Android 系统消费，不会自动传给 WebView。
 * 这里重写 dispatchKeyEvent，把遥控器按键手动转发给 Capacitor 的 WebView，
 * 让 JS 层的 useTVKeyboard hook 能接收到 KeyboardEvent。
 */
public class MainActivity extends BridgeActivity {

    // 需要转发给 WebView 的按键码（遥控器常见按键）
    private static final int[] TV_FORWARD_KEYS = {
        KeyEvent.KEYCODE_DPAD_UP,
        KeyEvent.KEYCODE_DPAD_DOWN,
        KeyEvent.KEYCODE_DPAD_LEFT,
        KeyEvent.KEYCODE_DPAD_RIGHT,
        KeyEvent.KEYCODE_DPAD_CENTER,       // 确认键
        KeyEvent.KEYCODE_ENTER,
        KeyEvent.KEYCODE_BACK,              // 返回键
        KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
        KeyEvent.KEYCODE_MEDIA_PLAY,
        KeyEvent.KEYCODE_MEDIA_PAUSE,
        KeyEvent.KEYCODE_MEDIA_NEXT,
        KeyEvent.KEYCODE_MEDIA_PREVIOUS,
        KeyEvent.KEYCODE_MEDIA_STOP,
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        enableEdgeToEdge(getWindow());
        registerPlugin(LocalMusicPlugin.class);
        registerPlugin(BilibiliProxyPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * 拦截所有按键事件：
     *  - TV 遥控器按键 → 注入给 Capacitor WebView，让 JS 层处理
     *  - 返回键 (BACK) → 先注入给 WebView，由 JS 的 handleBackAction 处理页面回退；
     *    若 WebView 未消费则走系统默认（最小化 App）
     *  - 其余按键 → 走父类默认逻辑
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();

        for (int tvKey : TV_FORWARD_KEYS) {
            if (keyCode == tvKey) {
                // 把按键事件直接派给 WebView
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    boolean consumed = webView.dispatchKeyEvent(event);
                    // 返回键：如果 JS 没消费（例如已在根页面），让系统处理（最小化）
                    if (keyCode == KeyEvent.KEYCODE_BACK && !consumed) {
                        return super.dispatchKeyEvent(event);
                    }
                    if (consumed) return true;
                }
                break;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        int nightModeFlags = newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        boolean isDarkMode = nightModeFlags == Configuration.UI_MODE_NIGHT_YES;
        PluginHandle handle = getBridge().getPlugin("LocalMusicPlugin");
        if (handle != null) {
            ((LocalMusicPlugin) handle.getInstance()).notifyDarkModeChange(isDarkMode);
        }
    }
}
