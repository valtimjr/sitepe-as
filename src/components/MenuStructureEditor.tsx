import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderTree, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import type { CustomList, MenuItem } from '@/types/supabase';
import { createMenuItem, deleteMenuItem, getAllMenuItemsFlat, getCustomLists, saveAllMenuItems, updateMenuItem } from '@/services/customListService';
import { useSession } from './SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';
import { buildMenuTree } from '@/lib/menuTree';
import MenuTree from './menu-admin/MenuTree';
import MenuItemFormSheet, { type MenuItemFormValues } from './menu-admin/MenuItemFormSheet';

interface MenuStructureEditorProps {
  onMenuUpdated: () => void;
  /** Abre a edição da lista (aba Listas). */
  onEditList: (listId: string) => void;
}

const countableItems = (list?: CustomList) =>
  (list?.items_data ?? []).filter(i => i.type !== 'subtitle' && i.type !== 'separator').length;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Remove campos de árvore antes de salvar. */
const stripTree = ({ children: _children, ...item }: MenuItem): MenuItem => item;

const MenuStructureEditor: React.FC<MenuStructureEditorProps> = ({ onMenuUpdated, onEditList }) => {
  const { user } = useSession();
  const { company } = useCompany();
  const isCompact = useIsCompact();
  const [flatItems, setFlatItems] = useState<MenuItem[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);

  // Reordenação otimista: guarda o último estado salvo e junta movimentos seguidos (400ms).
  const savedRef = useRef<MenuItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items, lists] = await Promise.all([
        getAllMenuItemsFlat(company),
        user ? getCustomLists(user.id, company) : Promise.resolve([]),
      ]);
      setFlatItems(items);
      savedRef.current = items;
      setCustomLists(lists);
    } catch {
      showError('Erro ao carregar dados do menu.');
    } finally {
      setIsLoading(false);
    }
  }, [user, company]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const tree = useMemo(() => buildMenuTree(flatItems), [flatItems]);
  const listById = useMemo(() => new Map(customLists.map(l => [l.id, l])), [customLists]);
  const totalItems = flatItems.filter(i => !i.isDynamic).length;

  const getMeta = useCallback(
    (item: MenuItem) => {
      if (item.isDynamic) return 'Subtítulo';
      if (item.list_id) {
        const list = listById.get(item.list_id);
        return list ? `Lista · ${plural(countableItems(list), 'item', 'itens')}` : 'Lista';
      }
      const children = flatItems.filter(i => i.parent_id === item.id && !i.isDynamic).length;
      return `Pasta · ${plural(children, 'item', 'itens')}`;
    },
    [flatItems, listById],
  );

  const scheduleSave = (next: MenuItem[]) => {
    setFlatItems(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      try {
        await saveAllMenuItems(next, company);
        savedRef.current = next;
        onMenuUpdated();
      } catch {
        showError('Erro ao reordenar itens. A ordem anterior foi restaurada.');
        setFlatItems(savedRef.current);
      }
    }, 400);
  };

  const applyOrder = (ids: string[]) => {
    const order = new Map(ids.map((id, index) => [id, index]));
    scheduleSave(flatItems.map(i => (order.has(i.id) ? { ...i, order_index: order.get(i.id)! } : i)));
  };

  const siblingsOf = (item: MenuItem) =>
    flatItems
      .filter(i => !i.isDynamic && i.parent_id === item.parent_id)
      .sort((a, b) => a.order_index - b.order_index);

  const handleMove = (item: MenuItem, direction: 'up' | 'down') => {
    const ids = siblingsOf(item).map(i => i.id);
    const from = ids.indexOf(item.id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    applyOrder(ids);
  };

  const toggle = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openNew = (parentId: string | null) => {
    setEditingItem(null);
    setInitialParentId(parentId);
    setFormOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setInitialParentId(item.parent_id);
    setFormOpen(true);
  };

  const nextOrderIndex = (parentId: string | null) => {
    const siblings = flatItems.filter(i => !i.isDynamic && i.parent_id === parentId);
    return siblings.length ? Math.max(...siblings.map(i => i.order_index)) + 1 : 0;
  };

  const handleSave = async (values: MenuItemFormValues) => {
    try {
      if (editingItem) {
        const movedParent = values.parent_id !== editingItem.parent_id;
        await updateMenuItem(
          {
            ...stripTree(editingItem),
            ...values,
            order_index: movedParent ? nextOrderIndex(values.parent_id) : editingItem.order_index,
          },
          company,
        );
        showSuccess('Item atualizado!');
      } else {
        await createMenuItem({ ...values, order_index: nextOrderIndex(values.parent_id) }, company);
        showSuccess('Item criado!');
      }
      if (values.parent_id) setExpandedIds(prev => new Set(prev).add(values.parent_id!));
      setFormOpen(false);
      await loadData();
      onMenuUpdated();
    } catch {
      showError('Erro ao salvar item de menu.');
    }
  };

  const handleDelete = async (item: MenuItem) => {
    try {
      await deleteMenuItem(item.id, company);
      showSuccess('Item excluído!');
      await loadData();
      onMenuUpdated();
    } catch {
      showError('Erro ao excluir item de menu.');
    }
  };

  const handleEditList = (listId: string) => {
    setFormOpen(false);
    onEditList(listId);
  };

  return (
    <Card className="w-full" data-testid="menu-structure-editor">
      <CardHeader className="flex flex-col gap-3 space-y-0 p-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pb-3">
        <div className="min-w-0">
          <CardTitle className="text-xl font-bold sm:text-2xl">Estrutura do Menu</CardTitle>
          <p className="text-sm text-muted-foreground" data-testid="menu-item-count">
            {plural(totalItems, 'item', 'itens')}
          </p>
        </div>
        <Button onClick={() => openNew(null)} className="h-11 w-full gap-2 sm:h-10 sm:w-auto" data-testid="new-menu-item">
          <PlusCircle className="h-4 w-4" /> Novo item
        </Button>
      </CardHeader>
      <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <div className="space-y-2" data-testid="menu-tree-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center">
            <FolderTree className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum item de menu cadastrado para esta empresa.</p>
            <Button onClick={() => openNew(null)} className="h-11 gap-2">
              <PlusCircle className="h-4 w-4" /> Criar o primeiro item
            </Button>
          </div>
        ) : (
          <div data-testid="menu-tree">
            <MenuTree
              nodes={tree}
              isCompact={isCompact}
              expandedIds={expandedIds}
              onToggle={toggle}
              getMeta={getMeta}
              onReorder={applyOrder}
              onEdit={openEdit}
              onAddChild={id => openNew(id)}
              onMove={handleMove}
              onDelete={handleDelete}
              onEditList={handleEditList}
            />
          </div>
        )}
      </CardContent>

      <MenuItemFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
        initialParentId={initialParentId}
        flatItems={flatItems}
        customLists={customLists}
        onSave={handleSave}
        onEditList={handleEditList}
      />
    </Card>
  );
};

export default MenuStructureEditor;
