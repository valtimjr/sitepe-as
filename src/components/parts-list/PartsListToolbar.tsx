import React from 'react';
import { Layers, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface PartsListToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  groupByAf: boolean;
  onToggleGroupByAf: () => void;
}

/** Filtro da lista e o chip "Agrupar por AF". */
const PartsListToolbar: React.FC<PartsListToolbarProps> = ({ query, onQueryChange, groupByAf, onToggleGroupByAf }) => (
  <div className="flex items-center gap-2 mb-3" data-testid="parts-list-toolbar">
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        enterKeyHint="search"
        placeholder="Filtrar nesta lista"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="pl-9 pr-11 h-11 text-base [&::-webkit-search-cancel-button]:hidden"
        autoComplete="off"
        aria-label="Filtrar nesta lista"
      />
      {query && (
        <button
          type="button"
          className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground"
          aria-label="Limpar filtro"
          onClick={() => onQueryChange('')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
    <button
      type="button"
      aria-pressed={groupByAf}
      onClick={() => {
        tap();
        onToggleGroupByAf();
      }}
      className={cn(
        'shrink-0 flex items-center gap-1.5 h-11 px-3 rounded-full border text-sm font-semibold transition-colors',
        groupByAf ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground',
      )}
      data-testid="parts-list-group-af"
    >
      <Layers className="h-4 w-4" /> Agrupar por AF
    </button>
  </div>
);

export default PartsListToolbar;
