import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.mtsolar.gestao',
  appName: 'Gestão MTSolar',
  webDir: 'dist',
  server: {
    url: 'https://gest-o-mt-solar.vercel.app',
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
