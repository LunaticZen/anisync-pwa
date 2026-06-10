package com.anisync.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

/**
 * Foreground Service — Keeps the app alive on MIUI/HyperOS.
 *
 * Xiaomi's aggressive battery management kills background network connections
 * (including our Socket.io link) within seconds of the screen turning off.
 * Running a foreground service with mediaPlayback type tells the OS:
 * "This app is actively streaming media — do NOT kill its network."
 *
 * On Samsung and other OEMs this is harmless but unnecessary;
 * the service is lightweight (no CPU/battery drain) and only shows
 * a persistent notification while the app is running.
 */
public class KeepAliveService extends Service {

    private static final String CHANNEL_ID = "anisync_keep_alive";
    private static final int NOTIFICATION_ID = 1;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("AniSync")
                .setContentText("Anime senkronizasyonu aktif")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setSilent(true)
                .build();

        startForeground(NOTIFICATION_ID, notification);
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopForeground(true);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "AniSync Senkronizasyon",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Anime izleme senkronizasyonu arka planda çalışır");
            channel.setShowBadge(false);
            channel.enableLights(false);
            channel.enableVibration(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
