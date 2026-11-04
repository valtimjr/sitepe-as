import React from 'react';
import { Search } from 'lucide-react';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import type { RelatedItem } from '@/types/supabase';

interface RelatedPartsListProps {
  items: RelatedItem[];
  /** Busca o código do item relacionado. */
  onSearch?: (code: string) => void;
}

const codeOf = (item: RelatedItem) => (typeof item === 'string' ? item.split('|')[0] || '' : item.codigo);

/** Lista de itens relacionados, com botão "Buscar" em cada um. */
const RelatedPartsList: React.FC<RelatedPartsListProps> = ({ items, onSearch }) => (
  <ul className="divide-y text-xs text-muted-foreground" data-testid="related-parts-list">
    {items.map((rel, i) => {
      const code = codeOf(rel);
      return (
        <li key={`${code}-${i}`} className="flex items-center gap-2 py-1" data-testid="related-part-item">
          <div className="min-w-0 flex-1">
            <RelatedPartDisplay item={rel} />
          </div>
          {onSearch && code && (
            <button
              type="button"
              className="flex min-h-11 shrink-0 items-center gap-1 px-2 text-xs font-semibold text-primary active:bg-primary/10"
              onClick={e => {
                e.stopPropagation();
                onSearch(code);
              }}
              aria-label={`Buscar ${code}`}
            >
              <Search className="h-3.5 w-3.5" /> Buscar
            </button>
          )}
        </li>
      );
    })}
  </ul>
);

export default RelatedPartsList;
