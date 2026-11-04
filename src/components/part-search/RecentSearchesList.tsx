import React from 'react';
import { Clock } from 'lucide-react';

interface RecentSearchesListProps {
  recent: string[];
  onSelect: (term: string) => void;
  onClear: () => void;
}

/** Buscas recentes (compartilhadas entre a busca rápida e a página). */
const RecentSearchesList: React.FC<RecentSearchesListProps> = ({ recent, onSelect, onClear }) =>
  recent.length > 0 ? (
    <div className="py-2" data-testid="recent-searches">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Buscas recentes</span>
        <button type="button" className="min-h-9 px-1 text-xs font-medium text-primary" onClick={onClear}>
          Limpar
        </button>
      </div>
      {recent.map(term => (
        <button
          key={term}
          type="button"
          onClick={() => onSelect(term)}
          className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm active:bg-muted"
          data-testid="recent-search-item"
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 truncate">{term}</span>
        </button>
      ))}
    </div>
  ) : (
    <p className="px-6 py-12 text-center text-sm text-muted-foreground">Digite o código, a descrição ou as tags da peça.</p>
  );

export default RecentSearchesList;
