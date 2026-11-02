import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { dispatchAppRefresh } from '@/hooks/useAppRefresh';
import { success, tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const THRESHOLD = 70;
const MAX_PULL = 120;

/** Elementos onde o gesto não deve iniciar o "puxar para atualizar". */
const isBlockedTarget = (target: EventTarget | null) => {
  let el = target instanceof Element ? target : null;
  if (el?.closest('[data-vaul-drawer], [role="dialog"], [data-no-ptr], .embla, input, textarea, select')) return true;
  // Algum ancestral rolável que não está no topo
  while (el && el !== document.body) {
    if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0) return true;
    }
    el = el.parentElement;
  }
  return false;
};

/** Puxar para atualizar (mobile). Dispara `app:refresh`; sem ouvintes, invalida o React Query. */
const PullToRefresh: React.FC<{ children: React.ReactNode; enabled?: boolean }> = ({ children, enabled = true }) => {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const passedRef = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const reset = () => {
      startY.current = null;
      pullRef.current = 0;
      passedRef.current = false;
      setPull(0);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return;
      if (window.scrollY > 0 || document.body.style.overflow === 'hidden' || isBlockedTarget(e.target)) return;
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || window.scrollY > 0) {
        if (pullRef.current !== 0) reset();
        return;
      }
      // Resistência: quanto mais puxa, menos anda
      const distance = Math.min(MAX_PULL, delta * 0.5);
      pullRef.current = distance;
      setPull(distance);
      if (distance >= THRESHOLD && !passedRef.current) {
        passedRef.current = true;
        tap();
      } else if (distance < THRESHOLD) {
        passedRef.current = false;
      }
      if (e.cancelable) e.preventDefault();
    };

    const onEnd = async () => {
      if (startY.current === null) return;
      const shouldRefresh = pullRef.current >= THRESHOLD;
      startY.current = null;
      if (!shouldRefresh) {
        reset();
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        const handled = await dispatchAppRefresh();
        if (handled === 0) await queryClient.invalidateQueries();
        success();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        reset();
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', reset);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [queryClient, enabled]);

  const progress = Math.min(1, pull / THRESHOLD);
  const visible = pull > 0 || refreshing;

  return (
    <>
      <div
        className="lg:hidden pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center"
        style={{
          top: 'calc(env(safe-area-inset-top) + 3.5rem)',
          transform: `translateY(${pull - 44}px)`,
          opacity: visible ? 1 : 0,
          transition: startY.current === null ? 'transform 200ms ease, opacity 200ms ease' : 'none',
        }}
        aria-hidden={!visible}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-md">
          {refreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <RefreshCw
              className={cn('h-5 w-5 transition-colors', progress >= 1 ? 'text-primary' : 'text-muted-foreground')}
              style={{ transform: `rotate(${progress * 270}deg)` }}
            />
          )}
        </div>
        {pull >= THRESHOLD && !refreshing && (
          <span className="mt-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-primary shadow-sm">
            Solte para atualizar
          </span>
        )}
      </div>
      <div
        style={{
          transform: pull > 0 ? `translateY(${pull * 0.4}px)` : undefined,
          transition: startY.current === null ? 'transform 200ms ease' : 'none',
        }}
      >
        {children}
      </div>
    </>
  );
};

export default PullToRefresh;
