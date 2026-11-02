import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock, Loader2, Search, X } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import { useMobileNav } from '@/context/MobileNavContext';
import { searchParts } from '@/services/partListService';
import { Part } from '@/types/supabase';
import AddPartPopover from '@/components/AddPartPopover';

const RECENT_KEY = 'autoboard_recent_searches';
const MAX_RECENT = 5;

const loadRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

const saveRecent = (term: string) => {
  const next = [term, ...loadRecent().filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
};

/** Busca rápida em tela cheia (celular/tablet). */
const MobileSearchOverlay: React.FC = () => {
  const { isSearchOpen, setSearchOpen } = useMobileNav();
  const { company } = useCompany();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

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

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchParts(term, company);
        setResults(found.slice(0, 20));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, company]);

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
            enterKeyHint="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Código, descrição ou tags"
            className="h-11 w-full rounded-none border bg-muted/40 pl-9 pr-10 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            data-testid="mobile-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-none text-muted-foreground active:bg-muted"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
        {!query.trim() ? (
          recent.length > 0 ? (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Buscas recentes</span>
                <button
                  type="button"
                  className="text-xs font-medium text-primary"
                  onClick={() => {
                    localStorage.removeItem(RECENT_KEY);
                    setRecent([]);
                  }}
                >
                  Limpar
                </button>
              </div>
              {recent.map(term => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm active:bg-muted"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{term}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Digite o código, a descrição ou as tags da peça.
            </p>
          )
        ) : isLoading && results.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhuma peça encontrada para "{query}".</p>
        ) : (
          <ul className="space-y-2 p-3">
            {results.map(part => (
              <li
                key={part.id}
                className="flex items-center gap-2 rounded-none border bg-card p-3 shadow-sm"
                data-testid="mobile-search-result"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => goToAll(part.codigo)}
                >
                  <div className="text-base font-bold text-primary">{part.codigo}</div>
                  <div className="line-clamp-2 text-sm leading-snug text-muted-foreground">{part.descricao}</div>
                </button>
                <AddPartPopover
                  part={part}
                  company={company}
                  idPrefix="mobile-search"
                  triggerClassName="h-11 w-11 rounded-none bg-primary/10"
                />
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => goToAll(query)}
                className="flex w-full items-center justify-center gap-1 rounded-none py-3 text-sm font-semibold text-primary active:bg-primary/10"
              >
                Ver todos os resultados
                <ChevronRight className="h-4 w-4" />
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default MobileSearchOverlay;
