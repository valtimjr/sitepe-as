import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import { MadeWithDyad } from '@/components/made-with-dyad';
import PartItemForm from '@/components/PartItemForm';
import PartsListDisplay from '@/components/PartsListDisplay';
import { ListCarousel } from '@/components/ListCarousel';
import ListIcon from '@/components/list-icon/ListIcon';
import { useCompany } from '@/context/CompanyContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { LocalList } from '@/services/localListStorage';
import type { SimplePartItem } from '@/services/partListService';
import type { ListIcon as ListIconData } from '@/types/listIcon';
import type { ListCover as ListCoverData } from '@/types/listCover';
import ListCover from '@/components/list-cover/ListCover';
import AddCoverButton from '@/components/list-cover/AddCoverButton';
import type { CoverUploadMode } from '@/components/list-cover/tabs/UploadTab';
import { cn } from '@/lib/utils';

export interface PartsListDesktopProps {
  lists: LocalList[];
  activeList: LocalList | null;
  items: SimplePartItem[];
  isLoading: boolean;
  listTitle: string;
  onReload: () => void;
  onItemsReordered: (items: SimplePartItem[]) => void;
  onTitleChange: (title: string) => void;
  onSelectList: (id: string) => void;
  onCreateList: (name: string, icon?: ListIconData | null) => void;
  onRenameList: (id: string, newName: string, icon?: ListIconData | null) => void;
  onDuplicateList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onReorderLists: (orderedIds: string[]) => void;
  onCoverChange: (cover: ListCoverData | null) => void;
  coverUploadMode: CoverUploadMode;
}

const formatLastUpdated = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Hoje às ${timeStr}`;
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dateStr} às ${timeStr}`;
};

/** Minha Lista de Peças no computador (layout de sempre). */
const PartsListDesktop: React.FC<PartsListDesktopProps> = ({
  lists,
  activeList,
  items,
  isLoading,
  listTitle,
  onReload,
  onItemsReordered,
  onTitleChange,
  onSelectList,
  onCreateList,
  onRenameList,
  onDuplicateList,
  onDeleteList,
  onReorderLists,
  onCoverChange,
  coverUploadMode,
}) => {
  const { company, branding } = useCompany();
  const isMobile = useIsMobile();
  const [editingItem, setEditingItem] = useState<SimplePartItem | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const handleOpenEditForm = useCallback((item: SimplePartItem) => {
    setEditingItem(item);
    setIsEditFormOpen(true);
  }, []);

  const handleCloseEditForm = useCallback(() => {
    setEditingItem(null);
    setIsEditFormOpen(false);
    onReload();
  }, [onReload]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <h1 className="text-4xl font-extrabold mb-6 mt-8 text-center text-primary dark:text-primary flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <img src="/icons/tela_inicial/8.png" alt="" className="h-16 w-auto object-contain" />
          Minha Lista de Peças
        </div>
        <span className="text-2xl font-bold opacity-80">{branding.name}</span>
      </h1>

      {!isLoading && (
        <ListCarousel
          lists={lists}
          activeListId={activeList?.id ?? ''}
          company={company}
          companyName={branding.name}
          onSelectList={onSelectList}
          onCreateList={onCreateList}
          onRenameList={onRenameList}
          onDuplicateList={onDuplicateList}
          onDeleteList={onDeleteList}
          onReorderLists={onReorderLists}
          onListChanged={onReload}
        />
      )}

      {activeList && (
        <div className="w-full max-w-6xl mx-auto mb-6" data-testid="parts-list-cover-area">
          {activeList.cover && (
            <ListCover
              key={activeList.id}
              cover={activeList.cover}
              onChange={onCoverChange}
              uploadMode={coverUploadMode}
              className="border border-b-0 border-border/60"
            />
          )}
        <div className={cn('group relative px-4 py-3 bg-card border border-border/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3', activeList.cover && 'pt-10')}>
          <div className="flex items-center gap-3">
            <div
              className={cn(activeList.cover && 'absolute -top-8 left-4')}
              data-testid={activeList.cover ? 'list-cover-icon' : undefined}
            >
              <ListIcon
                name={activeList.name}
                icon={activeList.icon}
                size={activeList.cover ? 'lg' : 'md'}
                elevated={!!activeList.cover}
                className={activeList.cover ? undefined : 'p-2'}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-2">
                <h2 className="font-bold text-lg text-foreground">Lista: {activeList.name}</h2>
                {!activeList.cover && (
                  <AddCoverButton
                    onChange={onCoverChange}
                    uploadMode={coverUploadMode}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? 'peça cadastrada' : 'peças cadastradas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4 text-primary/70" />
            <span>Última alteração: {formatLastUpdated(activeList.updatedAt)}</span>
          </div>
        </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl" aria-label="Carregando lista" data-testid="parts-list-desktop-skeleton">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-7 w-2/3" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="divide-y border-y">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-6 w-6" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <PartItemForm onItemAdded={onReload} />
          <PartsListDisplay
            listItems={items}
            onListChanged={onReload}
            onListReordered={onItemsReordered}
            listTitle={listTitle}
            onTitleChange={onTitleChange}
            onOpenEditForm={handleOpenEditForm}
            listIcon={activeList?.icon}
            listCover={activeList?.cover}
            listId={activeList?.id}
          />
        </div>
      )}

      <div className="flex justify-center mt-8 mb-8">
        <Link to={`/${company}`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>

      <MadeWithDyad />

      {isMobile && (
        <Sheet open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <ResponsiveSheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <PartItemForm editingItem={editingItem} onItemAdded={handleCloseEditForm} onCloseEdit={handleCloseEditForm} />
            </div>
          </ResponsiveSheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default PartsListDesktop;
