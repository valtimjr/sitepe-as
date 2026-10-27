import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AnyIconComponent } from '@/lib/listIconRegistry';

const PAGE = 300;

interface IconGridProps {
  names: string[];
  icons: Record<string, AnyIconComponent>;
  suggestions: string[];
  selected?: string;
  onSelect: (name: string) => void;
  /** Remove sufixo (ex.: "Icon") do nome exibido no title */
  stripSuffix?: string;
  header?: React.ReactNode;
  testIdPrefix: string;
  /** Função de busca vinda do catálogo carregado sob demanda */
  searchIconNames: (names: string[], query: string) => string[];
}

const IconGrid: React.FC<IconGridProps> = ({
  names, icons, suggestions, selected, onSelect, stripSuffix, header, testIdPrefix, searchIconNames,
}) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => searchIconNames(names, query), [searchIconNames, names, query]);

  useEffect(() => {
    setLimit(PAGE);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [query, names]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80 && limit < filtered.length) {
      setLimit(l => l + PAGE);
    }
  };

  const label = (name: string) => (stripSuffix && name.endsWith(stripSuffix) ? name.slice(0, -stripSuffix.length) : name);

  const renderButton = (name: string, key: string) => {
    const Comp = icons[name];
    if (!Comp) return null;
    return (
      <button
        key={key}
        type="button"
        title={label(name)}
        aria-label={label(name)}
        data-testid={`${testIdPrefix}-${name}`}
        onClick={() => onSelect(name)}
        className={cn(
          'flex items-center justify-center aspect-square rounded-md hover:bg-accent text-foreground transition-colors',
          selected === name && 'ring-2 ring-primary bg-primary/10'
        )}
      >
        <Comp className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar ícone (ex.: caminhão, truck)"
          className="h-9 pl-8 text-sm"
          data-testid={`${testIdPrefix}-search`}
          autoFocus
        />
      </div>
      {header}
      {!query && (
        <div className="grid grid-cols-8 gap-1 pb-2 border-b border-border">
          {suggestions.map(n => renderButton(n, `s-${n}`))}
        </div>
      )}
      <div ref={scrollRef} onScroll={handleScroll} className="overflow-y-auto min-h-0 flex-1 max-h-[250px]">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum ícone encontrado.</p>
        ) : (
          <div className="grid grid-cols-8 gap-1 pr-1">
            {filtered.slice(0, limit).map(n => renderButton(n, n))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IconGrid;
