import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import { usePartSearch } from '@/hooks/usePartSearch';
import { useAppRefresh } from '@/hooks/useAppRefresh';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { clearRecent, loadRecent, saveRecent } from '@/lib/recentSearches';
import PartSearchResults from '@/components/part-search/PartSearchResults';
import RecentSearchesList from '@/components/part-search/RecentSearchesList';

const PAGE_SIZE = 30;
const hasObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;

/** Página de busca de peças no celular: busca fixa no topo e rolagem infinita. */
const SearchPartsMobile: React.FC = () => {
  const { company } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [input, setInput] = useState(urlQuery);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const appHeaderHidden = useHideOnScroll();
  const { parts, total, isLoading, isLoadingMore, hasMore, loadMore, refresh } = usePartSearch({
    query: input,
    company,
    pageSize: PAGE_SIZE,
  });

  // Voltar/avançar no navegador muda o ?q=
  useEffect(() => {
    setInput(prev => (prev === urlQuery ? prev : urlQuery));
  }, [urlQuery]);

  const updateQuery = useCallback(
    (value: string) => {
      setInput(value);
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (value) next.set('q', value);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const searchTerm = useCallback(
    (term: string) => {
      updateQuery(term);
      setRecent(saveRecent(term));
      window.scrollTo({ top: 0 });
    },
    [updateQuery],
  );

  useAppRefresh(() => {
    window.scrollTo({ top: 0 });
    return refresh();
  });

  // Fecha o teclado ao rolar a lista
  useEffect(() => {
    const onTouchMove = () => {
      if (document.activeElement === inputRef.current) inputRef.current?.blur();
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => window.removeEventListener('touchmove', onTouchMove);
  }, []);

  // Rolagem infinita
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasObserver || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) loadMore();
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const term = input.trim();

  return (
    <div className="min-h-screen bg-background px-3 pb-28 text-foreground" data-testid="search-parts-mobile">
      <div
        className="sticky z-30 -mx-3 border-b bg-background/95 px-3 pb-1 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-[top] duration-300 ease-out"
        style={{ top: appHeaderHidden ? 'env(safe-area-inset-top)' : 'calc(env(safe-area-inset-top) + 3.5rem)' }}
        data-testid="search-parts-mobile-header"
      >
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault();
            if (term) setRecent(saveRecent(term));
            inputRef.current?.blur();
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              value={input}
              onChange={e => updateQuery(e.target.value)}
              placeholder="Código, descrição ou tags"
              aria-label="Buscar peça"
              className="h-11 w-full rounded-none border bg-muted/40 pl-9 pr-10 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              data-testid="search-parts-input"
            />
            {input && (
              <button
                type="button"
                onClick={() => {
                  updateQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-none text-muted-foreground active:bg-muted"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
        {term && (
          <p className="py-1 text-xs text-muted-foreground" data-testid="search-parts-total" aria-live="polite">
            {isLoading ? 'Buscando…' : `${total} ${total === 1 ? 'peça' : 'peças'}`}
          </p>
        )}
      </div>

      <div className="pt-3">
        {!term ? (
          <RecentSearchesList
            recent={recent}
            onSelect={searchTerm}
            onClear={() => {
              clearRecent();
              setRecent([]);
            }}
          />
        ) : (
          <PartSearchResults
            parts={parts}
            isLoading={isLoading}
            query={input}
            company={company}
            onSearch={searchTerm}
            onClear={() => updateQuery('')}
            idPrefix="search-page"
            footer={
              hasMore || isLoadingMore ? (
                <div ref={sentinelRef} className="flex justify-center py-4" data-testid="search-parts-sentinel">
                  {isLoadingMore ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Carregando mais" />
                  ) : (
                    !hasObserver && (
                      <button
                        type="button"
                        onClick={loadMore}
                        className="min-h-11 px-4 text-sm font-semibold text-primary active:bg-primary/10"
                      >
                        Carregar mais
                      </button>
                    )
                  )}
                </div>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
};

export default SearchPartsMobile;
