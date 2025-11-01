import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle, ChevronDown, ChevronRight, List as ListIcon, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { MenuItem, CustomList } from '@/types/supabase';
import { getAllMenuItemsFlat, createMenuItem, updateMenuItem, deleteMenuItem, getCustomLists } from '@/services/customListService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from './SessionContextProvider';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MenuStructureEditorProps {
  onMenuUpdated: () => void;
}

// Função auxiliar para construir a hierarquia (duplicada do service para uso local na UI)
const buildMenuHierarchy = (items: MenuItem[]): MenuItem[] => {
  const map: { [key: string]: MenuItem } = {};
  const roots: MenuItem[] = [];

  items.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });

  items.forEach(item => {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children!.push(map[item.id]);
    } else if (!item.parent_id) {
      roots.push(map[item.id]);
    }
  });

  const sortChildren = (menuItems: MenuItem[]) => {
    menuItems.sort((a, b) => a.order_index - b.order_index);
    menuItems.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
};

const MenuStructureEditor: React.FC<MenuStructureEditorProps> = ({ onMenuUpdated }) => {
  const { user } = useSession();
  const [flatMenuItems, setFlatMenuItems] = useState<MenuItem[]>([]);
  const [menuHierarchy, setMenuHierarchy] = useState<MenuItem[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMenuItem, setCurrentMenuItem] = useState<MenuItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formListId, setFormListId] = useState<string | null>(null);
  const [formOrderIndex, setFormOrderIndex] = useState(0);

  // Drag and Drop states
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedFlatItems, fetchedLists] = await Promise.all([
        getAllMenuItemsFlat(),
        user ? getCustomLists(user.id) : Promise.resolve([]),
      ]);
      
      setFlatMenuItems(fetchedFlatItems);
      setMenuHierarchy(buildMenuHierarchy(fetchedFlatItems));
      setCustomLists(fetchedLists);
    } catch (error) {
      showError('Erro ao carregar dados do menu.');
      console.error('Failed to load menu data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddMenuItem = (parentId: string | null = null) => {
    setCurrentMenuItem(null);
    setFormTitle('');
    setFormParentId(parentId);
    setFormListId(null);
    setFormOrderIndex(flatMenuItems.length); // Define a ordem como o último
    setIsDialogOpen(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setCurrentMenuItem(item);
    setFormTitle(item.title);
    setFormParentId(item.parent_id);
    setFormListId(item.list_id);
    setFormOrderIndex(item.order_index);
    setIsDialogOpen(true);
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      await deleteMenuItem(id);
      showSuccess('Item de menu excluído com sucesso!');
      await loadData();
      onMenuUpdated();
    } catch (error) {
      showError('Erro ao excluir item de menu.');
      console.error('Failed to delete menu item:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showError('O título é obrigatório.');
      return;
    }

    try {
      const payload: Omit<MenuItem, 'id' | 'created_at'> = {
        title: formTitle.trim(),
        parent_id: formParentId,
        list_id: formListId,
        order_index: formOrderIndex,
      };

      if (currentMenuItem) {
        await updateMenuItem({ ...currentMenuItem, ...payload });
        showSuccess('Item de menu atualizado com sucesso!');
      } else {
        await createMenuItem(payload);
        showSuccess('Item de menu criado com sucesso!');
      }
      
      setIsDialogOpen(false);
      await loadData();
      onMenuUpdated();
    } catch (error) {
      showError('Erro ao salvar item de menu.');
      console.error('Failed to save menu item:', error);
    }
  };

  const handleMoveItem = async (item: MenuItem, direction: 'up' | 'down') => {
    const siblings = flatMenuItems
      .filter(i => i.parent_id === item.parent_id)
      .sort((a, b) => a.order_index - b.order_index);

    const currentIndex = siblings.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const currentItem = siblings[currentIndex];
    const targetItem = siblings[targetIndex];

    if (!currentItem || !targetItem) return;

    const loadingToastId = showLoading('Reordenando itens...');

    try {
      // Troca os índices de ordem
      await Promise.all([
        updateMenuItem({ ...currentItem, order_index: targetItem.order_index }),
        updateMenuItem({ ...targetItem, order_index: currentItem.order_index }),
      ]);

      showSuccess('Ordem atualizada!');
      await loadData();
      onMenuUpdated();
    } catch (error) {
      showError('Erro ao reordenar itens.');
      console.error('Failed to reorder menu items:', error);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: MenuItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id); // Usar o ID para identificar o item
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-t-2', 'border-primary'); // Feedback visual
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-primary');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetItem: MenuItem) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-t-2', 'border-primary');

    if (draggedItem && draggedItem.id !== targetItem.id) {
      // Apenas permite reordenar dentro do mesmo nível hierárquico
      if (draggedItem.parent_id !== targetItem.parent_id) {
        showError('Não é possível mover itens entre níveis hierárquicos via arrastar e soltar nesta visualização.');
        setDraggedItem(null);
        return;
      }

      const siblings = flatMenuItems
        .filter(i => i.parent_id === draggedItem.parent_id)
        .sort((a, b) => a.order_index - b.order_index);

      const draggedIndex = siblings.findIndex(item => item.id === draggedItem.id);
      const targetIndex = siblings.findIndex(item => item.id === targetItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrderedSiblings = [...siblings];
        const [removed] = newOrderedSiblings.splice(draggedIndex, 1);
        newOrderedSiblings.splice(targetIndex, 0, removed);
        
        const loadingToastId = showLoading('Reordenando itens...');
        try {
          // Persiste a nova ordem no banco de dados
          const updatePromises = newOrderedSiblings.map((item, index) => 
            updateMenuItem({ ...item, order_index: index })
          );
          await Promise.all(updatePromises);
          showSuccess('Ordem atualizada com sucesso!');
          await loadData(); // Recarrega para garantir a consistência
          onMenuUpdated();
        } catch (error) {
          showError('Erro ao reordenar itens.');
          console.error('Failed to persist new order:', error);
        } finally {
          dismissToast(loadingToastId);
        }
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedItem(null);
  };
  // --- End Drag and Drop Handlers ---

  const renderMenuItem = (item: MenuItem, level: number, siblings: MenuItem[]) => {
    const isListLink = !!item.list_id;
    const hasChildren = item.children && item.children.length > 0;
    const isFirst = siblings.findIndex(i => i.id === item.id) === 0;
    const isLast = siblings.findIndex(i => i.id === item.id) === siblings.length - 1;

    return (
      <div 
        key={item.id} 
        draggable // Habilita o arrastar
        onDragStart={(e) => handleDragStart(e, item)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, item)}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        data-id={item.id}
        className={cn("border-b last:border-b-0 relative", level > 0 && 'ml-4')}
      >
        <div className={cn(
          "flex items-center py-2 px-3 transition-colors",
          isListLink ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-muted/20'
        )}>
          <div className="flex-1 flex items-center gap-2" style={{ paddingLeft: `${level * 10}px` }}>
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" /> {/* Drag handle */}
            {hasChildren ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={cn("font-medium", isListLink && 'text-primary')}>
              {item.title}
            </span>
            {isListLink && (
              <ListIcon className="h-4 w-4 text-primary ml-2" />
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleMoveItem(item, 'up')}
                  disabled={isFirst}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mover para Cima</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleMoveItem(item, 'down')}
                  disabled={isLast}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mover para Baixo</TooltipContent>
            </Tooltip>
            
            {!isListLink && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handleAddMenuItem(item.id)}>
                    <PlusCircle className="h-4 w-4 text-green-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Adicionar Submenu</TooltipContent>
              </Tooltip>
            )}
            
            <Button variant="ghost" size="icon" onClick={() => handleEditMenuItem(item)}>
              <Edit className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover o item "{item.title}" e todos os seus submenus/itens associados. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteMenuItem(item.id)}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {hasChildren && item.children!.map(child => renderMenuItem(child, level + 1, item.children!))}
      </div>
    );
  };

  const availableParents = flatMenuItems.filter(item => !item.list_id); // Apenas itens que não são links de lista podem ser pais

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <CardTitle className="text-2xl font-bold">Estrutura do Menu de Peças</CardTitle>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={() => handleAddMenuItem(null)} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Adicionar Item Raiz
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando estrutura do menu...</p>
        ) : menuHierarchy.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item de menu cadastrado.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {menuHierarchy.map(item => renderMenuItem(item, 0, menuHierarchy))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentMenuItem ? 'Editar Item de Menu' : 'Adicionar Novo Item de Menu'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Menu/Submenu</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parent_id">Item Pai (Submenu de)</Label>
              <Select
                value={formParentId || 'root'} // Usando 'root' para representar null
                onValueChange={(value) => setFormParentId(value === 'root' ? null : value)}
              >
                <SelectTrigger id="parent_id">
                  <SelectValue placeholder="Nível Raiz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Nível Raiz</SelectItem> {/* Usando 'root' */}
                  {availableParents.map(item => (
                    <SelectItem key={item.id} value={item.id} disabled={item.id === currentMenuItem?.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="list_id">Link para Lista de Peças (Opcional)</Label>
              <Select
                value={formListId || 'none'} // Usando 'none' para representar null
                onValueChange={(value) => setFormListId(value === 'none' ? null : value)}
                disabled={hasChildren(currentMenuItem)}
              >
                <SelectTrigger id="list_id">
                  <SelectValue placeholder="Nenhum (É um Submenu)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (É um Submenu)</SelectItem> {/* Usando 'none' */}
                  {customLists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasChildren(currentMenuItem) && (
                <p className="text-sm text-muted-foreground">Remova os submenus para linkar a uma lista.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_index">Ordem de Exibição</Label>
              <Input
                id="order_index"
                type="number"
                value={formOrderIndex}
                onChange={(e) => setFormOrderIndex(parseInt(e.target.value) || 0)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Helper para verificar se um item tem filhos (usado para desabilitar link de lista)
const hasChildren = (item: MenuItem | null) => {
  if (!item) return false;
  // Esta é uma verificação heurística baseada no estado atual da hierarquia
  return item.children && item.children.length > 0;
};

export default MenuStructureEditor;