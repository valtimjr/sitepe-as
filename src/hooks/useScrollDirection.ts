import { useEffect, useState } from 'react';

interface Options {
  /** Só esconde depois de rolar além deste ponto (px). */
  offset?: number;
  /** Variação mínima de scroll para mudar de direção (evita tremedeira). */
  threshold?: number;
  enabled?: boolean;
}

/** Retorna `true` quando o usuário está rolando para baixo (e passou do offset). */
export const useHideOnScroll = ({ offset = 60, threshold = 8, enabled = true }: Options = {}) => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      if (y <= offset) {
        setHidden(false);
        lastY = y;
        return;
      }
      if (Math.abs(delta) < threshold) return;
      setHidden(delta > 0);
      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset, threshold, enabled]);

  return hidden;
};
