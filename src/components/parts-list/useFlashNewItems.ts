import { useEffect, useRef, useState } from 'react';

const FLASH_MS = 1600;

/**
 * Ids das peças que acabaram de entrar na lista (para piscar) e rola até a 1ª.
 * Ignora o 1º carregamento e a troca de lista.
 */
export const useFlashNewItems = (items: { id: string }[], listId: string | undefined) => {
  const prevRef = useRef<{ listId: string | undefined; ids: Set<string> } | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { listId, ids: new Set(items.map((i) => i.id)) };
    if (!prev || !listId || prev.listId !== listId) return;
    const fresh = items.filter((i) => !prev.ids.has(i.id)).map((i) => i.id);
    if (fresh.length > 0) setFlashIds(new Set(fresh));
  }, [items, listId]);

  useEffect(() => {
    if (flashIds.size === 0) return;
    const firstId = Array.from(flashIds)[0];
    const first = document.querySelector(`[data-item-id="${CSS.escape(firstId)}"]`);
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => setFlashIds(new Set()), FLASH_MS);
    return () => clearTimeout(t);
  }, [flashIds]);

  return flashIds;
};
