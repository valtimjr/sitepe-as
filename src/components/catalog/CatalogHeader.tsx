import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { tap } from '@/lib/haptics';

interface CatalogHeaderProps {
  compact: boolean;
  company: string;
  brandingName: string;
  categoriesCount: number;
  listsCount: number;
  allExpanded: boolean;
  canToggle: boolean;
  onToggleAll: () => void;
}

/** Cabeçalho do Catálogo: fixo e compacto no celular, título + ações na web. */
const CatalogHeader: React.FC<CatalogHeaderProps> = ({
  compact,
  company,
  brandingName,
  categoriesCount,
  listsCount,
  allExpanded,
  canToggle,
  onToggleAll,
}) => {
  const appHeaderHidden = useHideOnScroll({ enabled: compact });
  const toggleLabel = allExpanded ? 'Recolher tudo' : 'Expandir tudo';
  const ToggleIcon = allExpanded ? ChevronsDownUp : ChevronsUpDown;

  if (compact) {
    return (
      <div
        className="sticky z-30 -mx-4 -mt-4 mb-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 pt-2 pb-2 transition-[top] duration-300 ease-out"
        style={{ top: appHeaderHidden ? 'env(safe-area-inset-top)' : 'calc(env(safe-area-inset-top) + 3.5rem)' }}
        data-testid="catalog-header"
      >
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-primary truncate">Catálogo de Peças</h1>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 text-primary border-primary/30"
            onClick={() => {
              tap();
              onToggleAll();
            }}
            disabled={!canToggle}
            aria-label={toggleLabel}
            data-testid="catalog-toggle-all"
          >
            <ToggleIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1 flex gap-2 text-xs" data-testid="catalog-summary">
          <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
            {categoriesCount} {categoriesCount === 1 ? 'categoria' : 'categorias'} · {listsCount} {listsCount === 1 ? 'lista' : 'listas'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-8 mb-6 space-y-4" data-testid="catalog-header">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" asChild>
          <Link to={`/${company}`} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar para o Início
          </Link>
        </Button>
        <Button variant="outline" onClick={onToggleAll} disabled={!canToggle} data-testid="catalog-toggle-all">
          <ToggleIcon className="h-4 w-4 mr-2" /> {toggleLabel}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <img src="/icons/tela_inicial/11.png" alt="" className="h-10 w-auto object-contain" />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary leading-tight">Catálogo de Peças</h1>
          <p className="text-sm text-muted-foreground">
            {brandingName} · {categoriesCount} {categoriesCount === 1 ? 'categoria' : 'categorias'} · {listsCount}{' '}
            {listsCount === 1 ? 'lista' : 'listas'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CatalogHeader;
