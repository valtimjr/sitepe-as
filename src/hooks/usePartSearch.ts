import { useCallback, useEffect, useRef, useState } from 'react';
import { searchPartsPaginated } from '@/services/partListService';
import type { Part } from '@/types/supabase';
import type { CompanyType } from '@/types/company';

interface Options {
  query: string;
  company: CompanyType;
  pageSize?: number;
  /** Só a primeira página (sem "carregar mais"). */
  singlePage?: boolean;
}

/** Busca paginada com debounce de 300 ms; respostas antigas são descartadas. */
export const usePartSearch = ({ query, company, pageSize = 30, singlePage = false }: Options) => {
  const term = query.trim();
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const requestId = useRef(0);

  const fetchFirst = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      const res = await searchPartsPaginated(term, company, 1, pageSize);
      if (id !== requestId.current) return;
      setParts(res.parts);
      setTotal(res.totalCount);
      setPage(1);
    } catch {
      if (id !== requestId.current) return;
      setParts([]);
      setTotal(0);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [term, company, pageSize]);

  useEffect(() => {
    if (!term) {
      requestId.current++;
      setParts([]);
      setTotal(0);
      setPage(1);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(fetchFirst, 300);
    return () => clearTimeout(timer);
  }, [term, fetchFirst]);

  const hasMore = !singlePage && parts.length < total;

  const loadMore = useCallback(async () => {
    if (!term || isLoading || isLoadingMore || !hasMore) return;
    const id = requestId.current;
    const next = page + 1;
    setIsLoadingMore(true);
    try {
      const res = await searchPartsPaginated(term, company, next, pageSize);
      if (id !== requestId.current) return;
      setParts(prev => {
        const seen = new Set(prev.map(p => p.id));
        return [...prev, ...res.parts.filter(p => !seen.has(p.id))];
      });
      setTotal(res.totalCount);
      setPage(next);
    } finally {
      if (id === requestId.current) setIsLoadingMore(false);
    }
  }, [term, company, pageSize, page, isLoading, isLoadingMore, hasMore]);

  const refresh = useCallback(async () => {
    if (!term) return;
    await fetchFirst();
  }, [term, fetchFirst]);

  return { parts, total, isLoading, isLoadingMore, hasMore, loadMore, refresh };
};
