import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.mtsolar.gestao',
  appName: 'Gestão MTSolar',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
