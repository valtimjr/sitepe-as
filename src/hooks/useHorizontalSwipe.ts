import { useRef } from 'react';
import type React from 'react';

interface Options {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Distância horizontal mínima (px). */
  threshold?: number;
  /** Ignora toques que começam perto das bordas da tela (gesto de voltar do sistema). */
  edgeMargin?: number;
  enabled?: boolean;
}

/** Elementos onde o deslize não deve trocar de dia. */
const isBlockedTarget = (target: EventTarget | null) => {
  let el = target instanceof Element ? target : null;
  if (el?.closest('input, textarea, select, [data-no-swipe], [data-vaul-drawer], [role="dialog"], [role="alertdialog"], [role="menu"]')) return true;
  // Áreas com rolagem horizontal própria
  while (el && el !== document.body) {
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
};

/** Handlers de toque que detectam um deslize horizontal intencional. */
export const useHorizontalSwipe = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  edgeMargin = 24,
  enabled = true,
}: Options) => {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    start.current = null;
    if (!enabled || e.touches.length !== 1) return;
    const active = document.activeElement;
    if (active && active.matches('input, textarea, select')) return;
    const { clientX, clientY } = e.touches[0];
    if (clientX < edgeMargin || clientX > window.innerWidth - edgeMargin) return;
    if (isBlockedTarget(e.target)) return;
    start.current = { x: clientX, y: clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !enabled) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  };

  const onTouchCancel = () => {
    start.current = null;
  };

  return { onTouchStart, onTouchEnd, onTouchCancel };
};
