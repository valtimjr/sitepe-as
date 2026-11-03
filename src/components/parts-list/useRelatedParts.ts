import { useEffect, useMemo, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { getPartsByCodes } from '@/services/partListService';
import type { SimplePartItem } from '@/services/partListService';
import type { RelatedPart } from '@/types/supabase';

const EMPTY: RelatedPart[] = [];

/** Itens relacionados de cada código, buscando só os códigos que estão na lista. */
export const useRelatedParts = (items: SimplePartItem[]) => {
  const { company } = useCompany();
  const codesKey = useMemo(
    () =>
      Array.from(new Set(items.map((i) => (i.codigo_peca || '').trim()).filter(Boolean)))
        .sort()
        .join('\n'),
    [items],
  );
  const [map, setMap] = useState<Map<string, RelatedPart[]>>(() => new Map());

  useEffect(() => {
    if (!codesKey) {
      setMap(new Map());
      return;
    }
    let cancelled = false;
    getPartsByCodes(codesKey.split('\n'), company)
      .then((parts) => {
        if (cancelled) return;
        const next = new Map<string, RelatedPart[]>();
        parts.forEach((part, code) => {
          if (part.itens_relacionados && part.itens_relacionados.length > 0) next.set(code, part.itens_relacionados);
        });
        setMap(next);
      })
      .catch((e) => console.error('Error loading related parts:', e));
    return () => {
      cancelled = true;
    };
  }, [codesKey, company]);

  return map;
};

/** Itens relacionados de um código (lista vazia estável quando não há). */
export const relatedFor = (map: Map<string, RelatedPart[]>, code: string | undefined) =>
  map.get((code || '').trim().toLowerCase()) ?? EMPTY;
