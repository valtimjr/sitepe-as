import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle, ChevronDown, ChevronRight, List as ListIcon, ArrowUp, ArrowDown, Tag, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { MenuItem, CustomList, Part } from '@/types/supabase';
import { getAllMenuItemsFlat, createMenuItem, updateMenuItem, deleteMenuItem, getCustomLists } from '@/services/customListService';
import { getParts, searchParts as searchPartsService } from '@/services/partListService';
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
import PartSearchInput from './PartSearchInput'; // Para o campo de itens relacionados
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea'; // Importar Textarea

interface MenuStructureEditorProps {
  onMenuUpdated: () => void;
}

// Função auxiliar para construir a hierarquia (duplicada do service para uso local na UI)
const buildMenuHierarchy = (items: MenuItem[]): MenuItem[] => {
  const map: { [key: string]: MenuItem } = {};
  const roots: MenuItem[] = [];

  items.forEach(item => {
    map[item.id] = { ...item, children: [], itens_relacionados: item.itens_relacionados || [] };
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
  const [formItensRelacionados, setFormItensRelacionados] = useState<string[]>([]); // Novo estado
  
  // Estados para o PartSearchInput dentro do modal
  const [searchQueryRelated, setSearchQueryRelated] = useState('');
  const [searchResultsRelated, setSearchResultsRelated] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);

  // Bulk add related items state
  const [bulkRelatedPartsInput, setBulkRelatedPartsInput] = useState('');

  // NOVO: Estado para controlar a expansão dos itens do menu
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedFlatItems, fetchedLists, fetchedAllParts] = await Promise.all([
        getAllMenuItemsFlat(),
        user ? getCustomLists(user.id) : Promise.resolve([]),
        getParts(), // Carrega todas as peças para o PartSearchInput
      ]);
      
      setFlatMenuItems(fetchedFlatItems);
      setMenuHierarchy(buildMenuHierarchy(fetchedFlatItems));
      setCustomLists(fetchedLists);
      setAllAvailableParts(fetchedAllParts);
    } catch (error) {
      showError('Erro ao carregar dados do menu.');
      console.error('Failed to load menu data:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingParts(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Efeito para a busca de peças relacionadas
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQueryRelated.length > 1) {
        setIsLoadingParts(true);
        const results = await searchPartsService(searchQueryRelated);
        setSearchResultsRelated(results);
        setIsLoadingParts(false);
      } else {
        setSearchResultsRelated([]);
      }
    };
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQueryRelated]);

  const handleAddMenuItem = (parentId: string | null = null) => {
    setCurrentMenuItem(null);
    setFormTitle('');
    setFormParentId(parentId);
    setFormListId(null);
    setFormOrderIndex(flatMenuItems.length); // Define a ordem como o último
    setFormItensRelacionados([]); // Limpa itens relacionados
    setSearchQueryRelated(''); // Limpa a busca de relacionados
    setSearchResultsRelated([]);
    setBulkRelatedPartsInput(''); // Limpa o campo de bulk
    setIsDialogOpen(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setCurrentMenuItem(item);
    setFormTitle(item.title);
    setFormParentId(item.parent_id);
    setFormListId(item.list_id);
    setFormOrderIndex(item.order_index);
    setFormItensRelacionados(item.itens_relacionados || []); // Preenche itens relacionados
    setSearchQueryRelated(''); // Limpa a busca de relacionados
    setSearchResultsRelated([]);
    setBulkRelatedPartsInput(''); // Limpa o campo de bulk
    setIsDialogOpen(true);
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      await deleteMenuItem(id); // list.id é o ID da lista, itemId é o ID do item
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
        itens_relacionados: formItensRelacionados, // Inclui o novo campo
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

  const handleAddRelatedPart = (part: Part) => {
    if (!formItensRelacionados.includes(part.codigo)) {
      setFormItensRelacionados(prev => [...prev, part.codigo]);
      setSearchQueryRelated(''); // Limpa o campo de busca
      setSearchResultsRelated([]); // Limpa os resultados
      showSuccess(`Peça ${part.codigo} adicionada aos itens relacionados.`);
    } else {
      showError(`Peça ${part.codigo} já está na lista de itens relacionados.`);
    }
  };

  const handleRemoveRelatedPart = (codigo: string) => {
    setFormItensRelacionados(prev => prev.filter(c => c !== codigo));
    showSuccess(`Peça ${codigo} removida dos itens relacionados.`);
  };

  const handleBulkAddRelatedParts = () => {
    const newCodes = bulkRelatedPartsInput
      .split(';')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    if (newCodes.length === 0) {
      showError('Nenhum código válido encontrado para adicionar.');
      return;
    }

    const uniqueNewCodes = Array.from(new Set([...formItensRelacionados, ...newCodes]));
    setFormItensRelacionados(uniqueNewCodes);
    setBulkRelatedPartsInput('');
    showSuccess(`${newCodes.length} código(s) adicionado(s) aos itens relacionados.`);
  };

  // NOVO: Função para alternar o estado de expansão de um item
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const renderMenuItem = (item: MenuItem, level: number, siblings: MenuItem[]) => {
    const isListLink = !!item.list_id;
    const hasChildren = item.children && item.children.length > 0;
    const isFirst = siblings.findIndex(i => i.id === item.id) === 0;
    const isLast = siblings.findIndex(i => i.id === item.id) === siblings.length - 1;
    // NOVO: Verifica se o item está expandido
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id} className={cn("border-b last:border-b-0", level > 0 && 'ml-4')}>
        <div className={cn(
          "flex items-center py-2 px-3 transition-colors",
          isListLink ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-muted/20'
        )}>
          <div className="flex-1 flex items-center gap-2" style={{ paddingLeft: `${level * 10}px` }}>
            {hasChildren ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => toggleItemExpansion(item.id)} // NOVO: Usa a função de toggle
                className="h-6 w-6 p-0 text-muted-foreground shrink-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <ListIcon className="h-4 w-4 text-primary shrink-0" />
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
        {hasChildren && isExpanded && ( // NOVO: Usa isExpanded aqui
          <div className="w-full">
            {item.children!.map(child => renderMenuItem(child, level + 1, item.children!))}
          </div>
        )}
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
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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

            {/* Seção de Itens Relacionados */}
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Itens Relacionados (Códigos de Peça)
              </Label>
              <PartSearchInput
                onSearch={setSearchQueryRelated}
                searchResults={searchResultsRelated}
                onSelectPart={handleAddRelatedPart}
                searchQuery={searchQueryRelated}
                allParts={allAvailableParts}
                isLoading={isLoadingParts}
              />
              <div className="space-y-2">
                <Label htmlFor="bulk-related-parts" className="text-sm text-muted-foreground">
                  Adicionar múltiplos códigos (separados por ';')
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="bulk-related-parts"
                    value={bulkRelatedPartsInput}
                    onChange={(e) => setBulkRelatedPartsInput(e.target.value)}
                    placeholder="Ex: COD1; COD2; COD3"
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleBulkAddRelatedParts}
                    disabled={bulkRelatedPartsInput.trim().length === 0}
                    variant="outline"
                    size="icon"
                    aria-label="Adicionar em massa"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-24 w-full rounded-md border p-2">
                {formItensRelacionados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item relacionado adicionado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formItensRelacionados.map(codigo => (
                      <div key={codigo} className="flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                        {codigo}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 text-destructive"
                          onClick={() => handleRemoveRelatedPart(codigo)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                Adicione códigos de peças que estão relacionadas a este item de menu/submenu.
              </p>
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