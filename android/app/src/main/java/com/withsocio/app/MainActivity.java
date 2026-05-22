package com.withsocio.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // WebView stability fix to reduce white screens and crashes
        android.webkit.WebView.enableSlowWholeDocumentDraw();

        // Install the splash screen before calling super.onCreate()
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
