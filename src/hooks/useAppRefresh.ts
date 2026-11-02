import { useEffect, useRef } from 'react';

export const APP_REFRESH_EVENT = 'app:refresh';

export interface AppRefreshDetail {
  /** Promessas das páginas que estão atualizando; o PullToRefresh aguarda todas. */
  promises: Promise<unknown>[];
}

/** Dispara o evento global de atualização e retorna quantas páginas responderam. */
export const dispatchAppRefresh = async (): Promise<number> => {
  const detail: AppRefreshDetail = { promises: [] };
  window.dispatchEvent(new CustomEvent<AppRefreshDetail>(APP_REFRESH_EVENT, { detail }));
  await Promise.allSettled(detail.promises);
  return detail.promises.length;
};

/** Assina o evento `app:refresh` (puxar para atualizar) e executa o callback. */
export const useAppRefresh = (callback: () => unknown | Promise<unknown>) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AppRefreshDetail>).detail;
      const result = Promise.resolve(callbackRef.current());
      detail?.promises.push(result);
    };
    window.addEventListener(APP_REFRESH_EVENT, handler);
    return () => window.removeEventListener(APP_REFRESH_EVENT, handler);
  }, []);
};
