import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, Plus, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import SortableList from '@/components/sortable/SortableList';
import LoginModal from '@/components/LoginModal';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { addItemsToList, getActiveList, type LocalList } from '@/services/localListStorage';
import type { SimplePartItem } from '@/services/partListService';
import type { PickedPart } from '@/components/service-orders/mergeParts';
import type { ListIcon as ListIconData } from '@/types/listIcon';
import { matchesQuery } from '@/lib/textNormalize';
import { success, tap } from '@/lib/haptics';
import { showSuccess } from '@/utils/toast';
import PartsListMobileHeader from './PartsListMobileHeader';
import PartsListToolbar from './PartsListToolbar';
import PartsListMobileRow from './PartsListMobileRow';
import ListOptionsSheet from './ListOptionsSheet';
import PartsListSortSheet, { sortItems, type SortDirection, type SortField } from './PartsListSortSheet';
import { useListManagement } from './useListManagement';
import { useListActions } from './useListActions';
import { relatedFor, useRelatedParts } from './useRelatedParts';

const AddPartsSheet = lazy(() => import('./AddPartsSheet'));
const PartEditSheet = lazy(() => import('./PartEditSheet'));
const PartsListShareSheet = lazy(() => import('./PartsListShareSheet'));
const ImportWizardDialog = lazy(() => import('@/components/list-import/ImportWizardDialog'));
const CloudListsDialog = lazy(() => import('@/components/CloudListsDialog'));

const PAGE_SIZE = 60;
const TOOLBAR_MIN_ITEMS = 4;

export interface PartsListMobileProps {
  lists: LocalList[];
  activeList: LocalList | null;
  items: SimplePartItem[];
  isLoading: boolean;
  /** Atualiza a tela na hora e grava (com espera opcional de 400 ms). */
  onItemsChange: (items: SimplePartItem[], opts?: { debounce?: boolean }) => void;
  onReload: () => Promise<void>;
  onSelectList: (id: string) => void;
  onCreateList: (name: string, icon?: ListIconData | null) => void;
  onRenameList: (id: string, newName: string, icon?: ListIconData | null) => void;
  onDuplicateList: (id: string) => void;
  onDeleteList: (id: string) => void;
}

/** Minha Lista de Peças no celular. */
const PartsListMobile: React.FC<PartsListMobileProps> = ({
  lists,
  activeList,
  items,
  isLoading,
  onItemsChange,
  onReload,
  onSelectList,
  onCreateList,
  onRenameList,
  onDuplicateList,
  onDeleteList,
}) => {
  const { company, branding } = useCompany();
  const { user } = useSession();
  const keyboardOpen = useKeyboardOpen();
  const listName = activeList?.name ?? 'Minha Lista';

  const reloadVoid = useCallback(() => {
    onReload();
  }, [onReload]);

  const management = useListManagement({
    lists,
    company,
    companyName: branding.name,
    onCreateList,
    onRenameList,
    onDeleteList,
    onListChanged: reloadVoid,
  });
  const actions = useListActions({ items, title: listName, icon: activeList?.icon });
  const relatedMap = useRelatedParts(items);

  const [query, setQuery] = useState('');
  const [groupByAf, setGroupByAf] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [optionsList, setOptionsList] = useState<LocalList | null>(null);
  const [editingItem, setEditingItem] = useState<SimplePartItem | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [removed, setRemoved] = useState<{ index: number; item: SimplePartItem } | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set());

  // Ao trocar de lista, limpa filtro, aviso de desfazer e paginação
  useEffect(() => {
    setQuery('');
    setGroupByAf(false);
    setRemoved(null);
    setVisibleCount(PAGE_SIZE);
  }, [activeList?.id]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query, groupByAf]);

  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(t);
  }, [removed]);

  useEffect(() => {
    if (flashIds.size === 0) return;
    const first = document.querySelector(`[data-item-id="${Array.from(flashIds)[0]}"]`);
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => setFlashIds(new Set()), 1600);
    return () => clearTimeout(t);
  }, [flashIds]);

  // Handlers estáveis para o React.memo dos cartões
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const handleQuantity = useCallback(
    (id: string, quantidade: number) => {
      onItemsChange(
        itemsRef.current.map((i) => (i.id === id ? { ...i, quantidade } : i)),
        { debounce: true },
      );
    },
    [onItemsChange],
  );

  const handleRemove = useCallback(
    (id: string) => {
      const current = itemsRef.current;
      const index = current.findIndex((i) => i.id === id);
      if (index === -1) return;
      tap();
      setRemoved({ index, item: current[index] });
      onItemsChange(current.filter((i) => i.id !== id));
    },
    [onItemsChange],
  );

  const handleUndo = () => {
    if (!removed) return;
    const next = [...itemsRef.current];
    next.splice(Math.min(removed.index, next.length), 0, removed.item);
    onItemsChange(next);
    setRemoved(null);
  };

  const handleEdit = useCallback((item: SimplePartItem) => {
    tap();
    setEditingItem(item);
  }, []);

  const handleSaveEdit = (updated: SimplePartItem) => {
    onItemsChange(itemsRef.current.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleReorder = (ids: string[]) => {
    const byId = new Map(itemsRef.current.map((i) => [i.id, i]));
    onItemsChange(ids.map((id) => byId.get(id)!).filter(Boolean));
  };

  const handleSort = (field: SortField, direction: SortDirection) => {
    onItemsChange(sortItems(itemsRef.current, field, direction));
  };

  const flashNewItems = async (previousIds: Set<string>) => {
    const fresh = await getActiveList(company);
    const ids = fresh.items.filter((i) => !previousIds.has(i.id)).map((i) => i.id);
    if (ids.length > 0) setFlashIds(new Set(ids));
  };

  const handleAddParts = async (parts: PickedPart[], af: string) => {
    if (!activeList || parts.length === 0) return;
    const previousIds = new Set(itemsRef.current.map((i) => i.id));
    await onReload(); // grava pendências antes de somar
    await addItemsToList(
      company,
      activeList.id,
      parts.map((p) => ({ ...p, af: af || undefined })),
      { mergeDuplicates: true },
    );
    await onReload();
    success();
    showSuccess(parts.length === 1 ? '1 peça adicionada' : `${parts.length} peças adicionadas`);
    flashNewItems(previousIds);
  };

  const handleDetailedAdded = async () => {
    const previousIds = new Set(itemsRef.current.map((i) => i.id));
    await onReload();
    flashNewItems(previousIds);
  };

  const handleCloudLoad = () => {
    if (user) setCloudOpen(true);
    else setLoginOpen(true);
  };

  // Filtro e agrupamento
  const trimmedQuery = query.trim();
  const filtered = useMemo(
    () => (trimmedQuery ? items.filter((i) => matchesQuery([i.codigo_peca, i.descricao, i.af], trimmedQuery)) : items),
    [items, trimmedQuery],
  );

  const groups = useMemo(() => {
    if (!groupByAf) return null;
    const map = new Map<string, SimplePartItem[]>();
    filtered.forEach((i) => {
      const key = (i.af || '').trim();
      const arr = map.get(key);
      if (arr) arr.push(i);
      else map.set(key, [i]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [filtered, groupByAf]);

  const dragEnabled = !trimmedQuery && !groupByAf;
  const showToolbar = items.length >= TOOLBAR_MIN_ITEMS || !!trimmedQuery || groupByAf;

  const renderRow = (item: SimplePartItem) => (
    <PartsListMobileRow
      item={item}
      related={relatedFor(relatedMap, item.codigo_peca)}
      dragEnabled={dragEnabled}
      flash={flashIds.has(item.id)}
      onQuantity={handleQuantity}
      onRemove={handleRemove}
      onEdit={handleEdit}
    />
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-2" aria-label="Carregando lista">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <Skeleton className="h-8 w-6" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center text-center gap-3 rounded-lg border border-dashed px-6 py-12" data-testid="parts-list-empty">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <p className="font-semibold">Sua lista está vazia</p>
          <p className="text-sm text-muted-foreground">Adicione as peças que você precisa e envie quando quiser.</p>
          <Button className="h-11 mt-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar peças
          </Button>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center text-center gap-3 px-6 py-10" data-testid="parts-list-no-results">
          <SearchX className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma peça com "{trimmedQuery}"</p>
          <Button variant="outline" className="h-11" onClick={() => setQuery('')}>
            Limpar filtro
          </Button>
        </div>
      );
    }

    if (dragEnabled) {
      return (
        <SortableList
          items={items}
          getId={(i) => i.id}
          renderItem={renderRow}
          onReorder={handleReorder}
          className="space-y-2"
        />
      );
    }

    if (groups) {
      let shown = 0;
      return (
        <div className="space-y-4">
          {groups.map(([af, groupItems]) => {
            if (shown >= visibleCount) return null;
            const slice = groupItems.slice(0, visibleCount - shown);
            shown += slice.length;
            return (
              <section key={af || '__none'} data-testid="parts-list-af-group">
                <h2 className="px-1 pb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {af ? `AF ${af}` : 'Sem AF'} ({groupItems.length})
                </h2>
                <div className="space-y-2">
                  {slice.map((item) => (
                    <React.Fragment key={item.id}>{renderRow(item)}</React.Fragment>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filtered.slice(0, visibleCount).map((item) => (
          <React.Fragment key={item.id}>{renderRow(item)}</React.Fragment>
        ))}
      </div>
    );
  };

  const anySheetOpen =
    addOpen ||
    shareOpen ||
    sortOpen ||
    !!optionsList ||
    !!editingItem ||
    clearConfirm ||
    importOpen ||
    cloudOpen ||
    loginOpen ||
    management.anyDialogOpen;

  return (
    <div className="min-h-screen p-4 pb-28 bg-background text-foreground">
      <PartsListMobileHeader
        lists={lists}
        activeList={activeList}
        itemCount={items.length}
        onSelectList={onSelectList}
        onCreateList={management.openCreate}
        onOpenOptions={setOptionsList}
        onSort={() => setSortOpen(true)}
        onShare={() => setShareOpen(true)}
      />

      {showToolbar && !isLoading && (
        <PartsListToolbar
          query={query}
          onQueryChange={setQuery}
          groupByAf={groupByAf}
          onToggleGroupByAf={() => setGroupByAf((v) => !v)}
        />
      )}

      {renderBody()}

      {!dragEnabled && filtered.length > visibleCount && (
        <Button variant="ghost" className="w-full h-11 mt-2" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Mostrar mais ({filtered.length - visibleCount})
        </Button>
      )}

      {removed && (
        <div
          role="status"
          className="fixed left-4 right-[5.5rem] z-40 flex items-center justify-between rounded-lg bg-foreground text-background pl-4 pr-1 py-1 text-sm shadow-lg animate-in fade-in duration-150"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 20px)' }}
          data-testid="part-removed-notice"
        >
          Peça removida
          <Button
            type="button"
            variant="ghost"
            className="h-10 text-amber-300 hover:text-amber-200 hover:bg-transparent font-semibold"
            onClick={handleUndo}
          >
            Desfazer
          </Button>
        </div>
      )}

      {!keyboardOpen && !anySheetOpen && !isLoading && (
        <Button
          className="fixed right-4 z-40 h-14 w-14 rounded-full p-0 shadow-lg shadow-primary/30 bg-primary text-primary-foreground hover:bg-primary/90"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 16px)' }}
          onClick={() => {
            tap();
            setAddOpen(true);
          }}
          aria-label="Adicionar peças"
          data-testid="parts-list-fab"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}

      <ListOptionsSheet
        list={optionsList}
        canDelete={lists.length > 1}
        saving={!!optionsList && management.savingListId === optionsList.id}
        onOpenChange={(open) => !open && setOptionsList(null)}
        onRename={management.openRename}
        onDuplicate={(l) => onDuplicateList(l.id)}
        onCloudSave={(l) => management.requestCloudAction('save', l.id)}
        onCloudUpdate={(l) => management.requestCloudAction('update', l.id)}
        onCopy={management.copyListText}
        onDelete={management.openDelete}
      />

      <PartsListSortSheet open={sortOpen} onOpenChange={setSortOpen} onSort={handleSort} />

      {management.dialogs}

      <Suspense fallback={null}>
        {addOpen && (
          <AddPartsSheet
            onOpenChange={setAddOpen}
            listName={listName}
            onConfirm={handleAddParts}
            onDetailedAdded={handleDetailedAdded}
          />
        )}

        {editingItem && (
          <PartEditSheet
            key={editingItem.id}
            item={editingItem}
            related={relatedFor(relatedMap, editingItem.codigo_peca)}
            onOpenChange={(open) => !open && setEditingItem(null)}
            onSave={handleSaveEdit}
            onDelete={handleRemove}
          />
        )}

        {shareOpen && (
          <PartsListShareSheet
            open
            onOpenChange={setShareOpen}
            isEmpty={actions.isEmpty}
            onCopy={actions.copy}
            onWhatsApp={actions.whatsApp}
            onPdf={actions.pdf}
            onNativeShare={actions.nativeShare}
            onExport={actions.exportFile}
            onImport={() => setImportOpen(true)}
            onCloudSave={() => activeList && management.requestCloudAction('save', activeList.id)}
            onCloudLoad={handleCloudLoad}
            onClear={() => setClearConfirm(true)}
          />
        )}

        {importOpen && (
          <ImportWizardDialog open onOpenChange={setImportOpen} company={company} onImported={reloadVoid} />
        )}

        {cloudOpen && user && (
          <CloudListsDialog open onOpenChange={setCloudOpen} userId={user.id} company={company} onListOpened={reloadVoid} />
        )}
      </Suspense>

      <LoginModal
        isOpen={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={() => {
          setLoginOpen(false);
          setCloudOpen(true);
        }}
      />

      <AlertDialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar a lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as {items.length} peças de "{listName}" serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onItemsChange([]);
                setRemoved(null);
                showSuccess('Lista limpa.');
              }}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartsListMobile;
