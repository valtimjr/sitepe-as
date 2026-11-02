import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { showError, showSuccess } from '@/utils/toast';
import type { CustomList, CustomListItem, Part } from '@/types/supabase';
import { deleteCustomListItem, getCustomListItems, updateAllCustomListItems } from '@/services/customListService';
import CustomListItemForm from './CustomListItemForm';
import ResponsiveSheetContent from './responsive/ResponsiveSheetContent';
import SortableList from './sortable/SortableList';
import ListItemBlock from './custom-list-admin/ListItemBlock';
import ListIcon from './list-icon/ListIcon';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
  allAvailableParts: Part[];
}

/** Editor dos itens de uma lista: cabeçalho fixo, blocos por tipo e arrastar para reordenar. */
const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose, allAvailableParts }) => {
  const { company } = useCompany();
  const isCompact = useIsCompact();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CustomListItem | null>(null);
  const savedRef = useRef<CustomListItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetched = await getCustomListItems(list.id, company);
      setItems(fetched);
      savedRef.current = fetched;
    } catch {
      showError('Erro ao carregar itens da lista.');
    } finally {
      setIsLoading(false);
    }
  }, [list.id, company]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const handleSaved = () => {
    setIsFormOpen(false);
    setItemToEdit(null);
    loadItems();
  };

  const openForm = (item: CustomListItem | null) => {
    setItemToEdit(item);
    setIsFormOpen(true);
  };

  const handleDelete = async (item: CustomListItem) => {
    try {
      await deleteCustomListItem(list.id, item.id, company);
      showSuccess('Item excluído!');
      loadItems();
    } catch {
      showError('Erro ao excluir item.');
    }
  };

  // Reordenação otimista com debounce de 400ms; volta à ordem anterior se falhar.
  const applyOrder = (ids: string[]) => {
    const byId = new Map(items.map(i => [i.id, i]));
    const next = ids.map((id, index) => ({ ...byId.get(id)!, order_index: index }));
    setItems(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      try {
        await updateAllCustomListItems(list.id, next, company);
        savedRef.current = next;
      } catch {
        showError('Erro ao reordenar itens. A ordem anterior foi restaurada.');
        setItems(savedRef.current);
      }
    }, 400);
  };

  const handleMove = (item: CustomListItem, direction: 'up' | 'down') => {
    const ids = items.map(i => i.id);
    const from = ids.indexOf(item.id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    applyOrder(ids);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="custom-list-editor">
      <SheetHeader className="space-y-0 border-b px-3 pb-3 pt-4 pr-12 text-left sm:px-4 sm:pr-12">
        <div className="flex min-w-0 items-center gap-2.5">
          <ListIcon name={list.title} icon={list.icon} size="sm" className="h-9 w-9 rounded-md" />
          <div className="min-w-0">
            <SheetTitle className="line-clamp-2 break-words text-base sm:text-lg">{list.title}</SheetTitle>
            <SheetDescription className="text-xs">
              {items.length} {items.length === 1 ? 'linha' : 'linhas'} · segure a alça para reordenar
            </SheetDescription>
          </div>
        </div>
        <Button onClick={() => openForm(null)} className="mt-3 h-11 w-full gap-2 sm:h-10 sm:w-auto" data-testid="add-list-item">
          <PlusCircle className="h-4 w-4" /> Adicionar item
        </Button>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2 sm:px-3">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="m-2 rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum item nesta lista.
          </div>
        ) : (
          <SortableList
            items={items}
            getId={item => item.id}
            onReorder={applyOrder}
            className="divide-y"
            renderItem={(item, index) => (
              <ListItemBlock
                item={item}
                list={list}
                isCompact={isCompact}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onEdit={openForm}
                onMove={handleMove}
                onDelete={handleDelete}
              />
            )}
          />
        )}
      </div>

      <div className="border-t bg-background px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4">
        <Button variant="outline" className="h-11 w-full gap-2 sm:h-10 sm:w-auto" onClick={onClose} data-testid="close-list-editor">
          <X className="h-4 w-4" /> Fechar
        </Button>
      </div>

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <ResponsiveSheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{itemToEdit ? 'Editar item' : 'Adicionar item'}</SheetTitle>
            <SheetDescription>Lista "{list.title}".</SheetDescription>
          </SheetHeader>
          <CustomListItemForm
            list={list}
            editingItem={itemToEdit}
            onItemSaved={handleSaved}
            onClose={handleSaved}
            allAvailableParts={allAvailableParts}
          />
        </ResponsiveSheetContent>
      </Sheet>
    </div>
  );
};

export default CustomListEditor;
