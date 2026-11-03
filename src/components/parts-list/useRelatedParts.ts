import { useEffect, useMemo, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { getPartsByCodes } from '@/services/partListService';
import type { SimplePartItem } from '@/services/partListService';
import type { RelatedPart } from '@/types/supabase';

const EMPTY: RelatedPart[] = [];

export interface CatalogInfo {
  related: RelatedPart[];
  name?: string;
}

export type CatalogInfoMap = Map<string, CatalogInfo>;

/** Itens relacionados e nome de cada código, buscando só os códigos que estão na lista. */
export const useRelatedParts = (items: SimplePartItem[]) => {
  const { company } = useCompany();
  const codesKey = useMemo(
    () =>
      Array.from(new Set(items.map((i) => (i.codigo_peca || '').trim()).filter(Boolean)))
        .sort()
        .join('\n'),
    [items],
  );
  const [map, setMap] = useState<CatalogInfoMap>(() => new Map());

  useEffect(() => {
    if (!codesKey) {
      setMap(new Map());
      return;
    }
    let cancelled = false;
    getPartsByCodes(codesKey.split('\n'), company)
      .then((parts) => {
        if (cancelled) return;
        const next: CatalogInfoMap = new Map();
        parts.forEach((part, code) => {
          const related = part.itens_relacionados && part.itens_relacionados.length > 0 ? part.itens_relacionados : EMPTY;
          const name = (part.name || '').trim() || undefined;
          if (related.length > 0 || name) next.set(code, { related, name });
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

const infoFor = (map: CatalogInfoMap, code: string | undefined) => map.get((code || '').trim().toLowerCase());

/** Itens relacionados de um código (lista vazia estável quando não há). */
export const relatedFor = (map: CatalogInfoMap, code: string | undefined) => infoFor(map, code)?.related ?? EMPTY;

/** Nome da peça: o salvo no item ou, para peças antigas, o do catálogo. */
export const nameFor = (map: CatalogInfoMap, item: Pick<SimplePartItem, 'codigo_peca' | 'name'>) => {
  const own = (item.name || '').trim();
  if (own) return own;
  return infoFor(map, item.codigo_peca)?.name;
};
