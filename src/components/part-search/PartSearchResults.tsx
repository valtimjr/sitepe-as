import React, { useCallback, useEffect, useRef, useState } from 'react';
import PartSearchCard from './PartSearchCard';
import PartSearchSkeleton from './PartSearchSkeleton';
import PartTagsSheet from './PartTagsSheet';
import PartDetailsSheet from './PartDetailsSheet';
import PartAddSheet from './PartAddSheet';
import type { Part } from '@/types/supabase';
import type { CompanyType } from '@/types/company';

interface PartSearchResultsProps {
  parts: Part[];
  isLoading: boolean;
  query: string;
  company: CompanyType;
  /** Nova busca (tag ou código de relacionado). */
  onSearch: (term: string) => void;
  /** Mostra "Limpar busca" no estado vazio. */
  onClear?: () => void;
  idPrefix?: string;
  /** Conteúdo depois da lista (ex.: "Ver todos", marcador da rolagem infinita). */
  footer?: React.ReactNode;
}

/** Lista de cards de peça com skeleton, estado vazio e as gavetas de tags, detalhes e adicionar. */
const PartSearchResults: React.FC<PartSearchResultsProps> = ({
  parts,
  isLoading,
  query,
  company,
  onSearch,
  onClear,
  idPrefix = 'search',
  footer,
}) => {
  const [selected, setSelected] = useState<Part | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const addTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(addTimer.current), []);

  const openDetails = useCallback((part: Part) => {
    setSelected(part);
    setDetailsOpen(true);
  }, []);

  const openTags = useCallback((part: Part) => {
    setSelected(part);
    setTagsOpen(true);
  }, []);

  // Fecha os detalhes e só depois abre a gaveta de adicionar (nunca uma dentro da outra)
  const openAdd = useCallback(() => {
    setDetailsOpen(false);
    clearTimeout(addTimer.current);
    addTimer.current = setTimeout(() => setAddOpen(true), 350);
  }, []);

  return (
    <div aria-live="polite" aria-busy={isLoading}>
      {isLoading && parts.length === 0 ? (
        <PartSearchSkeleton />
      ) : parts.length === 0 ? (
        <div className="px-6 py-12 text-center" data-testid="part-search-empty">
          <p className="text-sm text-muted-foreground">Nenhuma peça encontrada para "{query.trim()}".</p>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="mt-3 min-h-11 px-4 text-sm font-semibold text-primary active:bg-primary/10"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2" data-testid="part-search-results">
          {parts.map(part => (
            <PartSearchCard
              key={part.id}
              part={part}
              company={company}
              onOpenDetails={openDetails}
              onOpenTags={openTags}
              onSearch={onSearch}
              idPrefix={idPrefix}
            />
          ))}
        </ul>
      )}
      {parts.length > 0 && footer}

      <PartTagsSheet part={selected} open={tagsOpen} onOpenChange={setTagsOpen} onSearchTag={onSearch} />
      <PartDetailsSheet part={selected} open={detailsOpen} onOpenChange={setDetailsOpen} onSearch={onSearch} onAdd={openAdd} />
      <PartAddSheet part={selected} company={company} open={addOpen} onOpenChange={setAddOpen} idPrefix={idPrefix} />
    </div>
  );
};

export default PartSearchResults;
