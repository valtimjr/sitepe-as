import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, Plus } from 'lucide-react';
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
import { useCompany } from '@/context/CompanyContext';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { addItemsToList, type LocalList } from '@/services/localListStorage';
import type { SimplePartItem } from '@/services/partListService';
import type { PickedPart } from '@/components/service-orders/mergeParts';
import type { ListIcon as ListIconData } from '@/types/listIcon';
import { success, tap } from '@/lib/haptics';
import { showSuccess } from '@/utils/toast';
import PartsListMobileHeader from './PartsListMobileHeader';
import PartsListTable from './PartsListTable';
import PartsListSortSheet, { sortItems, type SortDirection, type SortField } from './PartsListSortSheet';
import { useListManagement } from './useListManagement';
import { useListShareSheet } from './useListShareSheet';
import { useFlashNewItems } from './useFlashNewItems';
import { nameFor, relatedFor, useRelatedParts } from './useRelatedParts';

const AddPartsSheet = lazy(() => import('./AddPartsSheet'));
const PartEditSheet = lazy(() => import('./PartEditSheet'));

const PAGE_SIZE = 60;

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
  onReorderLists: (orderedIds: string[]) => void;
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
  onReorderLists,
}) => {
  const { company, branding } = useCompany();
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
  const relatedMap = useRelatedParts(items);
  const flashIds = useFlashNewItems(items, activeList?.id);

  const [groupByAf, setGroupByAf] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [addOpen, setAddOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SimplePartItem | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SimplePartItem | null>(null);

  const share = useListShareSheet({
    items,
    title: listName,
    icon: activeList?.icon,
    listId: activeList?.id,
    onClear: () => setClearConfirm(true),
    onReload: reloadVoid,
  });

  // Ao trocar de lista, desfaz o agrupamento e a paginação
  useEffect(() => {
    setGroupByAf(false);
    setPendingRemove(null);
    setVisibleCount(PAGE_SIZE);
  }, [activeList?.id]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [groupByAf]);

  // Handlers estáveis para o React.memo das linhas
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // A lixeira só pede confirmação; a remoção acontece no diálogo
  const handleRequestRemove = useCallback((id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    tap();
    setPendingRemove(item);
  }, []);

  const confirmRemove = () => {
    if (!pendingRemove) return;
    onItemsChange(itemsRef.current.filter((i) => i.id !== pendingRemove.id));
    if (editingItem?.id === pendingRemove.id) setEditingItem(null);
    setPendingRemove(null);
  };

  const handleEdit = useCallback((item: SimplePartItem) => {
    tap();
    setEditingItem(item);
  }, []);

  const handleSaveEdit = (updated: SimplePartItem) => {
    onItemsChange(itemsRef.current.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleReorder = useCallback(
    (ids: string[]) => {
      const byId = new Map(itemsRef.current.map((i) => [i.id, i]));
      onItemsChange(ids.map((id) => byId.get(id)!).filter(Boolean));
    },
    [onItemsChange],
  );

  const handleSort = (field: SortField, direction: SortDirection) => {
    onItemsChange(sortItems(itemsRef.current, field, direction));
  };

  const handleAddParts = async (parts: PickedPart[], af: string) => {
    if (!activeList || parts.length === 0) return;
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
  };

  // Agrupamento por AF
  const groups = useMemo(() => {
    if (!groupByAf) return null;
    const map = new Map<string, SimplePartItem[]>();
    items.forEach((i) => {
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
  }, [items, groupByAf]);

  const nameOf = useCallback((item: SimplePartItem) => nameFor(relatedMap, item), [relatedMap]);
  const relatedOf = useCallback((item: SimplePartItem) => relatedFor(relatedMap, item.codigo_peca), [relatedMap]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="divide-y border-y" aria-label="Carregando lista">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 pr-2">
              <Skeleton className="h-8 w-6" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-5 w-6" />
              <Skeleton className="h-8 w-8" />
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

    return (
      <div className="-mx-4">
        <PartsListTable
          items={items}
          groups={groups}
          visibleCount={visibleCount}
          flashIds={flashIds}
          nameOf={nameOf}
          relatedOf={relatedOf}
          onReorder={handleReorder}
          onRequestRemove={handleRequestRemove}
          onEdit={handleEdit}
        />
      </div>
    );
  };

  const anySheetOpen =
    addOpen ||
    sortOpen ||
    !!pendingRemove ||
    !!editingItem ||
    clearConfirm ||
    share.anyOpen ||
    management.anyDialogOpen;

  return (
    <div className="min-h-screen p-4 pb-28 bg-background text-foreground">
      <PartsListMobileHeader
        lists={lists}
        activeList={activeList}
        itemCount={items.length}
        company={company}
        companyName={branding.name}
        onSelectList={onSelectList}
        onCreateList={onCreateList}
        onRenameList={onRenameList}
        onDuplicateList={onDuplicateList}
        onDeleteList={onDeleteList}
        onReorderLists={onReorderLists}
        onListChanged={reloadVoid}
        onNewList={management.openCreate}
        onSort={() => setSortOpen(true)}
        onClear={() => setClearConfirm(true)}
        onShare={share.open}
      />

      {renderBody()}

      {groups && items.length > visibleCount && (
        <Button variant="ghost" className="w-full h-11 mt-2" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Mostrar mais ({items.length - visibleCount})
        </Button>
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

      <PartsListSortSheet
        open={sortOpen}
        onOpenChange={setSortOpen}
        onSort={handleSort}
        groupByAf={groupByAf}
        onToggleGroupByAf={() => setGroupByAf((v) => !v)}
      />

      {management.dialogs}
      {share.element}

      <Suspense fallback={null}>
        {addOpen && (
          <AddPartsSheet
            onOpenChange={setAddOpen}
            listName={listName}
            onConfirm={handleAddParts}
            onDetailedAdded={reloadVoid}
          />
        )}

        {editingItem && (
          <PartEditSheet
            key={editingItem.id}
            item={editingItem}
            name={nameFor(relatedMap, editingItem)}
            related={relatedFor(relatedMap, editingItem.codigo_peca)}
            onOpenChange={(open) => !open && setEditingItem(null)}
            onSave={handleSaveEdit}
            onRequestDelete={handleRequestRemove}
          />
        )}
      </Suspense>

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent data-testid="part-remove-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover peça?</AlertDialogTitle>
            <AlertDialogDescription>
              A peça "{pendingRemove?.codigo_peca || pendingRemove?.descricao || 'S/ Cód'}" será removida desta lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmRemove}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
