import React from 'react';
import { ArrowUpDown, FilePlus, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListIcon from '@/components/list-icon/ListIcon';
import { ListCarousel } from '@/components/ListCarousel';
import type { LocalList } from '@/services/localListStorage';
import type { CompanyType } from '@/types/company';
import type { ListIcon as ListIconData } from '@/types/listIcon';
import { useHideOnScroll } from '@/hooks/useScrollDirection';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import AddCoverButton from '@/components/list-cover/AddCoverButton';
import type { CoverUploadMode } from '@/components/list-cover/tabs/UploadTab';
import type { ListCover } from '@/types/listCover';

interface PartsListMobileHeaderProps {
  lists: LocalList[];
  activeList: LocalList | null;
  itemCount: number;
  company: CompanyType;
  companyName: string;
  onSelectList: (id: string) => void;
  onCreateList: (name: string, icon?: ListIconData | null) => void;
  onRenameList: (id: string, newName: string, icon?: ListIconData | null) => void;
  onDuplicateList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onReorderLists: (orderedIds: string[]) => void;
  onListChanged: () => void;
  /** Abre o diálogo "Criar Nova Lista". */
  onNewList: () => void;
  onSort: () => void;
  onClear: () => void;
  onShare: () => void;
  /** Com capa, o cabeçalho encosta nela em vez de subir sobre o padding. */
  hasCover?: boolean;
  onCoverChange: (cover: ListCover | null) => void;
  coverUploadMode: CoverUploadMode;
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

/** Cabeçalho fixo da Minha Lista no celular: título e Nova Lista; Ordenar, Limpar e Compartilhar ao lado de "Suas Listas". */
const PartsListMobileHeader: React.FC<PartsListMobileHeaderProps> = ({
  lists,
  activeList,
  itemCount,
  company,
  companyName,
  onSelectList,
  onCreateList,
  onRenameList,
  onDuplicateList,
  onDeleteList,
  onReorderLists,
  onListChanged,
  onNewList,
  onSort,
  onClear,
  onShare,
  hasCover,
  onCoverChange,
  coverUploadMode,
}) => {
  // Acompanha o header do app, que se esconde ao rolar
  const appHeaderHidden = useHideOnScroll();
  const name = activeList?.name ?? 'Minha Lista';
  const updated = formatUpdated(activeList?.updatedAt);

  const headerActions = (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
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
        className="h-10 w-10 shrink-0 text-destructive border-destructive/30 hover:text-destructive"
        onClick={() => {
          tap();
          onClear();
        }}
        disabled={itemCount === 0}
        aria-label="Limpar lista"
        data-testid="parts-list-clear-button"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="relative h-10 w-10 shrink-0 text-primary border-primary/30"
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
  );

  return (
    <div
      className={cn(
        'sticky z-30 -mx-4 mb-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 pt-2 pb-1 transition-[top] duration-300 ease-out',
        hasCover ? 'mt-0' : '-mt-4',
      )}
      style={{ top: appHeaderHidden ? 'env(safe-area-inset-top)' : 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      data-testid="parts-list-mobile-header"
    >
      <div className="flex items-center gap-2 mb-2">
        <ListIcon name={name} icon={activeList?.icon} size="sm" className="rounded-md p-1.5" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-primary line-clamp-1" data-testid="parts-list-mobile-title">
            {name}
          </h1>
          <p className="text-xs text-muted-foreground truncate" data-testid="parts-list-mobile-summary">
            {itemCount} {itemCount === 1 ? 'peça' : 'peças'}
            {updated && ` · ${updated}`}
          </p>
          {!hasCover && (
            <AddCoverButton onChange={onCoverChange} uploadMode={coverUploadMode} className="-ml-2 h-6" />
          )}
        </div>
        <Button
          size="sm"
          className="h-10 shrink-0 gap-1.5 font-bold"
          onClick={() => {
            tap();
            onNewList();
          }}
          data-testid="parts-list-new-list-button"
        >
          <FilePlus className="h-4 w-4" />
          Nova Lista
        </Button>
      </div>

      {lists.length > 0 && (
        <ListCarousel
          lists={lists}
          activeListId={activeList?.id ?? ''}
          company={company}
          companyName={companyName}
          onSelectList={onSelectList}
          onCreateList={onCreateList}
          onRenameList={onRenameList}
          onDuplicateList={onDuplicateList}
          onDeleteList={onDeleteList}
          onReorderLists={onReorderLists}
          onListChanged={onListChanged}
          hideSaveMenu
          headerActions={headerActions}
          className="mb-0 px-0"
        />
      )}
    </div>
  );
};

export default PartsListMobileHeader;
