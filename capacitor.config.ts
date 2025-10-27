import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.sleepyshibaskip',
  appName: 'AutoBoard',
  webDir: 'dist',
  // Adicionando configurações para melhorar a compatibilidade do WebView no Android
  android: {
    // Permite acesso a arquivos (necessário para alguns recursos do WebView)
    allowFileAccess: true,
    // Permite acesso universal a URLs de arquivos (pode ser necessário para IndexedDB em alguns WebViews)
    allowUniversalAccessFromFileURLs: true,
    // Adiciona aceleração de hardware explícita para melhor renderização
    webView: {
      androidHardwareAcceleration: true,
    },
  },
  // Configuração para geração de assets (ícones e splash screens)
  assets: {
    // Usando Logo.png como imagem de origem para ícones e splash screens
    icon: {
      source: 'public/Logo.png',
      // Opcional: Adicionar cores de fundo se o ícone for transparente
      backgroundColor: '#FFFFFF', 
      iconColor: '#000000',
    },
    splash: {
      source: 'public/Banner.png', // Mantendo o Banner para splash screen
      backgroundColor: '#FFFFFF',
      splashscreen: 'public/Banner.png',
      splashscreenDark: 'public/Banner.png',
      iconColor: '#000000',
    },
  }
};

export default config;