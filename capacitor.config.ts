import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.sleepyshibaskip',
  appName: 'AutoBoard',
  webDir: 'dist',
  server: {
    allowNavigation: [
      "vtwlcaikxfnhngisgfgu.supabase.co" // Adicionado o domínio do Supabase
    ]
  }
};

export default config;