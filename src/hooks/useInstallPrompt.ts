import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Guardado em nível de módulo: o evento pode disparar antes do componente montar
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** Expõe o prompt "Instalar app" do navegador (Android/Chrome), quando disponível. */
export const useInstallPrompt = () => {
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null);

  useEffect(() => {
    const update = () => setCanInstall(deferredPrompt !== null);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    const event = deferredPrompt;
    deferredPrompt = null;
    notify();
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
  }, []);

  return { canInstall, promptInstall };
};
