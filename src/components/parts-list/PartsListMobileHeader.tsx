import React from 'react';
import { ArrowUpDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListIcon from '@/components/list-icon/ListIcon';
import type { LocalList } from '@/services/localListStorage';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { tap } from '@/lib/haptics';
import ListChips from './ListChips';

interface PartsListMobileHeaderProps {
  lists: LocalList[];
  activeList: LocalList | null;
  itemCount: number;
  onSelectList: (id: string) => void;
  onCreateList: () => void;
  onOpenOptions: (list: LocalList) => void;
  onSort: () => void;
  onShare: () => void;
}

const formatUpdated = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `alterada hoje ${time}`;
  return `alterada ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
};

/** Cabeçalho fixo da Minha Lista no celular: título, Ordenar, Compartilhar e chips das listas. */
const PartsListMobileHeader: React.FC<PartsListMobileHeaderProps> = ({
  lists,
  activeList,
  itemCount,
  onSelectList,
  onCreateList,
  onOpenOptions,
  onSort,
  onShare,
}) => {
  // Acompanha o header do app, que se esconde ao rolar
  const appHeaderHidden = useHideOnScroll();
  const name = activeList?.name ?? 'Minha Lista';
  const updated = formatUpdated(activeList?.updatedAt);

  return (
    <div
      className="sticky z-30 -mx-4 -mt-4 mb-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 pt-2 pb-2 transition-[top] duration-300 ease-out"
      style={{ top: appHeaderHidden ? 'env(safe-area-inset-top)' : 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      data-testid="parts-list-mobile-header"
    >
      <div className="flex items-center gap-2">
        <ListIcon name={name} icon={activeList?.icon} size="sm" className="rounded-md p-1.5" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-primary line-clamp-1" data-testid="parts-list-mobile-title">
            {name}
          </h1>
          <p className="text-xs text-muted-foreground truncate" data-testid="parts-list-mobile-summary">
            {itemCount} {itemCount === 1 ? 'peça' : 'peças'}
            {updated && ` · ${updated}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => {
            tap();
            onSort();
          }}
          disabled={itemCount < 2}
          aria-label="Ordenar"
          data-testid="parts-list-sort-button"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="relative h-11 w-11 shrink-0 text-primary border-primary/30"
          onClick={() => {
            tap();
            onShare();
          }}
          aria-label="Compartilhar"
          data-testid="parts-list-share-button"
        >
          <Share2 className="h-4 w-4" />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow">
              {itemCount}
            </span>
          )}
        </Button>
      </div>

      <ListChips
        lists={lists}
        activeListId={activeList?.id ?? ''}
        onSelect={onSelectList}
        onOpenOptions={onOpenOptions}
        onCreate={onCreateList}
      />
    </div>
  );
};

export default PartsListMobileHeader;
