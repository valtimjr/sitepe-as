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
  }
  
};

export default config;