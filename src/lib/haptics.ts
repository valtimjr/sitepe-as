import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Alguns navegadores bloqueiam vibração sem interação do usuário
    }
  }
};

/** Vibração curta para toques (troca de aba, abrir sheet etc.). */
export const tap = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    return;
  }
  vibrate(10);
};

/** Feedback de sucesso (ex.: peça adicionada). */
export const success = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    return;
  }
  vibrate([10, 40, 10]);
};
