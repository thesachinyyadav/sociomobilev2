package com.withsocio.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
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

        // Register native Android notification channels
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Channel 1: announcements
            NotificationChannel announcementsChannel = new NotificationChannel(
                "announcements",
                "Announcements",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            announcementsChannel.setDescription("Admin and global announcements");

            // Channel 2: events
            NotificationChannel eventsChannel = new NotificationChannel(
                "events",
                "Events",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            eventsChannel.setDescription("Reminders for events and RSVPs");

            // Channel 3: attendance
            NotificationChannel attendanceChannel = new NotificationChannel(
                "attendance",
                "Attendance",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            attendanceChannel.setDescription("Volunteer scans and check-in updates");

            // Channel 4: approvals
            NotificationChannel approvalsChannel = new NotificationChannel(
                "approvals",
                "Approvals",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            approvalsChannel.setDescription("Workflow and approval updates");

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(announcementsChannel);
                manager.createNotificationChannel(eventsChannel);
                manager.createNotificationChannel(attendanceChannel);
                manager.createNotificationChannel(approvalsChannel);
            }
        }
    }
}
