package com.mtsolar.mtsolv;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
// O namespace do projeto permanece br.com.mtsolar.gestao (onde estão R e MainActivity)
import br.com.mtsolar.gestao.MainActivity;
import br.com.mtsolar.gestao.R;

/**
 * MyFirebaseMessagingService
 *
 * Processa mensagens FCM data-only quando o app está em background ou morto (killed state).
 * Payload do backend usa exclusivamente o campo "data" (sem "notification"),
 * o que força o Android a rotear a mensagem para onMessageReceived() mesmo com app fechado.
 * Este serviço então exibe a notificação local via NotificationCompat.
 */
public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID   = "whatsapp_messages";
    private static final String CHANNEL_NAME = "Mensagens WhatsApp";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // Lê os campos do payload data-only enviado pelo backend
        Map<String, String> data = remoteMessage.getData();
        if (data != null && !data.isEmpty()) {
            String title = data.containsKey("title") ? data.get("title") : "MT Solar";
            String body  = data.containsKey("body")  ? data.get("body")  : "Nova mensagem";
            showNotification(title, body);
        }
    }

    /**
     * Cria (se necessário) o canal de notificação e exibe a notificação local.
     * Canal criado com IMPORTANCE_HIGH para exibir heads-up notification.
     */
    private void showNotification(String title, String body) {
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Cria o canal de notificação no Android 8.0+ (Oreo)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setSound(
                android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                null
            );
            manager.createNotificationChannel(channel);
        }

        // Intent que abre o app ao tocar na notificação
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

        // PendingIntent compatível com Android 6.0+ (FLAG_IMMUTABLE obrigatório no 12+)
        int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            : PendingIntent.FLAG_ONE_SHOT;

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, pendingFlags
        );

        // Monta e exibe a notificação
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent);

        // Usa o timestamp como ID único para não sobrescrever notificações anteriores
        manager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
