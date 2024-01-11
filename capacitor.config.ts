import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moiste.midan',
  appName: 'midancap',
  webDir: 'dist/midancap/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
