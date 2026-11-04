import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import { useMobileNav } from '@/context/MobileNavContext';
import { usePartSearch } from '@/hooks/usePartSearch';
import { clearRecent, loadRecent, saveRecent } from '@/lib/recentSearches';
import PartSearchResults from '@/components/part-search/PartSearchResults';
import RecentSearchesList from '@/components/part-search/RecentSearchesList';

/** Busca rápida em tela cheia (celular/tablet). */
const MobileSearchOverlay: React.FC = () => {
  const { isSearchOpen, setSearchOpen } = useMobileNav();
  const { company } = useCompany();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const { parts, isLoading } = usePartSearch({ query: isSearchOpen ? query : '', company, pageSize: 20, singlePage: true });

  useEffect(() => {
    if (!isSearchOpen) return;
    setRecent(loadRecent());
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [isSearchOpen]);

  const searchTerm = useCallback((term: string) => {
    setQuery(term);
    setRecent(saveRecent(term));
  }, []);

  if (!isSearchOpen) return null;

  const close = () => {
    setSearchOpen(false);
    setQuery('');
  };

  const goToAll = (term: string) => {
    const value = term.trim();
    if (!value) return;
    setRecent(saveRecent(value));
    close();
    navigate(`/${company}/search-parts?q=${encodeURIComponent(value)}`);
  };

  return createPortal(
    <div
      className="lg:hidden fixed inset-0 z-50 flex flex-col bg-background pt-safe animate-in fade-in slide-in-from-bottom-4 duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisar peças"
      data-testid="mobile-search-overlay"
    >
      <form
        className="flex items-center gap-2 border-b px-2 py-2"
        onSubmit={e => {
          e.preventDefault();
          goToAll(query);
        }}
      >
        <button
          type="button"
          onClick={close}
          className="flex h-11 w-11 items-center justify-center rounded-none active:bg-muted"
          aria-label="Fechar busca"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Código, descrição ou tags"
            className="h-11 w-full rounded-none border bg-muted/40 pl-9 pr-10 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            aria-label="Buscar peça"
            data-testid="mobile-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
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

      <div
        className="flex-1 overflow-y-auto overscroll-contain pb-safe"
        onTouchMove={() => inputRef.current?.blur()}
      >
        {!query.trim() ? (
          <RecentSearchesList
            recent={recent}
            onSelect={setQuery}
            onClear={() => {
              clearRecent();
              setRecent([]);
            }}
          />
        ) : (
          <div className="p-3">
            <PartSearchResults
              parts={parts}
              isLoading={isLoading}
              query={query}
              company={company}
              onSearch={searchTerm}
              idPrefix="mobile-search"
              footer={
                <button
                  type="button"
                  onClick={() => goToAll(query)}
                  className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 rounded-none py-3 text-sm font-semibold text-primary active:bg-primary/10"
                >
                  Ver todos os resultados
                  <ChevronRight className="h-4 w-4" />
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default MobileSearchOverlay;
