"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal, ArrowUp, ArrowDown, GripVertical, Tag, Info, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part } from '@/types/supabase';
import { getCustomListItems, addCustomListItem, updateCustomListItem, deleteCustomListItem, deleteCustomListItem as deleteCustomListItemService, updateAllCustomListItems } from '@/services/customListService';
import { getParts, searchParts as searchPartsService, updatePart } from '@/services/partListService';
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { lazyGenerateCustomListPdf } from '@/utils/pdfExportUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import PartSearchInput from './PartSearchInput';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
  editingItem?: CustomListItem | null;
  onItemSaved?: () => void;
  allAvailableParts: Part[];
}

const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose, editingItem, onItemSaved, allAvailableParts }) => {
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentEditingItemId, setCurrentEditingItemId] = useState<string | null>(null);

  // Form states for main item
  const [formType, setFormType] = useState<'item' | 'subtitle' | 'separator'>('item');
  const [formItemName, setFormItemName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formItensRelacionados, setFormItensRelacionados] = useState<string[]>([]);
  
  // Search states for main item form
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [selectedPartFromSearch, setSelectedPartFromSearch] = useState<Part | null>(null);

  // Search states for related items form
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [relatedSearchResults, setSearchResultsRelated] = useState<Part[]>([]);

  // Bulk add related items state
  const [bulkRelatedPartsInput, setBulkRelatedPartsInput] = useState('');

  // Drag and Drop states
  const [draggedItem, setDraggedItem] = useState<CustomListItem | null>(null);
  const [draggedRelatedItem, setDraggedRelatedItem] = useState<string | null>(null);

  // State to control if the form is for a new item or editing an existing one
  const [isFormForNewItem, setIsFormForNewItem] = useState(false);

  // State for related items popover
  const [openRelatedItemsPopoverId, setOpenRelatedItemsPopoverId] = useState<string | null>(null);

  const isMobile = useIsMobile();

  const loadItems = useCallback(async () => {
    if (!list.id) {
      return;
    }
    setIsLoading(true);
    try {
      const fetchedItems = await getCustomListItems(list.id);
      setItems(fetchedItems);
    } catch (error) {
      console.error('Erro ao carregar itens da lista:', error);
      showError('Erro ao carregar itens da lista.');
    } finally {
      setIsLoading(false);
    }
  }, [list.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Efeito para preencher o formulário quando `editingItem` muda
  useEffect(() => {
    const initializeFormForEdit = async () => {
      if (editingItem) {
        setIsFormForNewItem(false);
        setCurrentEditingItemId(editingItem.id);
        setFormType(editingItem.type || 'item');
        setFormItemName(editingItem.item_name);
        setFormPartCode(editingItem.part_code || '');
        setFormDescription(editingItem.description || '');
        setFormQuantity(editingItem.quantity);
        setFormItensRelacionados(editingItem.itens_relacionados || []);
        setSearchQuery('');
        setSearchResults([]);
        setBulkRelatedPartsInput('');
        setRelatedSearchQuery('');
        setSearchResultsRelated([]);

        if (editingItem.part_code) {
          const results = await searchPartsService(editingItem.part_code);
          const part = results.find(p => p.codigo.toLowerCase() === editingItem.part_code!.toLowerCase());
          setSelectedPartFromSearch(part || null);
        } else {
          setSelectedPartFromSearch(null);
        }
      } else {
        // Se não houver editingItem, o formulário deve estar no modo de adição
        setIsFormForNewItem(true);
        setCurrentEditingItemId(null);
        resetForm();
        setSelectedPartFromSearch(null);
      }
    };

    initializeFormForEdit();
  }, [editingItem]);


  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
        // searchPartsService agora retorna apenas o array de Part[]
        const results = await searchPartsService(searchQuery);
        setSearchResults(results);
        setIsLoadingParts(false);
      } else {
        setSearchResults([]);
      }
    };
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchRelatedSearchResults = async () => {
      if (relatedSearchQuery.length > 1) {
        const results = await searchPartsService(relatedSearchQuery);
        setSearchResultsRelated(results);
      } else {
        setSearchResultsRelated([]);
      }
    };
    const handler = setTimeout(() => {
      fetchRelatedSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [relatedSearchQuery]);


  const resetForm = () => {
    setFormType('item');
    setFormItemName('');
    setFormPartCode('');
    setFormDescription('');
    setFormQuantity(1);
    setFormItensRelacionados([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPartFromSearch(null);
    setBulkRelatedPartsInput('');
    setRelatedSearchQuery('');
    setSearchResultsRelated([]);
  };

  const handleAdd = () => {
    setIsFormForNewItem(true);
    setCurrentEditingItemId(null);
    resetForm();
  };

  // CORRIGIDO: Função para editar item da tabela (preenche o formulário)
  const handleEditItemClick = (item: CustomListItem) => {
    setIsFormForNewItem(false);
    setCurrentEditingItemId(item.id);
    
    setFormType(item.type || 'item');
    setFormItemName(item.item_name);
    setFormPartCode(item.part_code || '');
    setFormDescription(item.description || '');
    setFormQuantity(item.quantity);
    setFormItensRelacionados(item.itens_relacionados || []);
    setSearchQuery('');
    setSearchResults([]);
    setBulkRelatedPartsInput('');
    setRelatedSearchQuery('');
    setSearchResultsRelated([]);

    if (item.part_code) {
      searchPartsService(item.part_code).then(results => {
        const part = results.find(p => p.codigo.toLowerCase() === item.part_code!.toLowerCase());
        setSelectedPartFromSearch(part || null);
      });
    } else {
      setSelectedPartFromSearch(null);
    }
  };

  const handleSelectPart = (part: Part) => {
    setSelectedPartFromSearch(part);
    setFormPartCode(part.codigo);
    setFormDescription(part.descricao);
    setFormItemName(part.name || part.descricao || '');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedItemName = formItemName.trim();
    const trimmedDescription = formDescription.trim();
    const trimmedPartCode = formPartCode.trim();

    if (formType === 'item' && formQuantity <= 0) {
      showError('A quantidade deve ser maior que zero para itens de peça.');
      return;
    }

    if (formType !== 'separator' && !trimmedItemName && !trimmedDescription) {
      showError('O Nome ou a Descrição deve ser preenchido.');
      return;
    }

    const finalItemName = trimmedItemName || trimmedDescription || (formType === 'separator' ? '---' : '');

    const payload: Omit<CustomListItem, 'id' | 'list_id'> = {
      type: formType,
      item_name: finalItemName,
      part_code: formType === 'item' ? trimmedPartCode || null : null,
      description: formType === 'item' ? trimmedDescription || null : null,
      quantity: formType === 'item' ? formQuantity : 0,
      order_index: currentEditingItemId ? items.find(i => i.id === currentEditingItemId)?.order_index ?? items.length : items.length,
      itens_relacionados: formType === 'item' ? formItensRelacionados : [],
    };

    try {
      if (currentEditingItemId) {
        await updateCustomListItem(list.id, { id: currentEditingItemId, list_id: list.id, ...payload });
        showSuccess('Item atualizado com sucesso!');
      } else {
        await addCustomListItem(list.id, payload);
        showSuccess('Item adicionado com sucesso!');
      }
      
      resetForm();
      setCurrentEditingItemId(null);
      loadItems();
      onItemSaved?.();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      showError('Erro ao salvar item.');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteCustomListItemService(list.id, itemId);
      showSuccess('Item excluído com sucesso!');
      loadItems();
      onItemSaved?.();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      showError('Erro ao excluir item.');
    }
  };

  const handleMoveItem = async (item: CustomListItem, direction: 'up' | 'down') => {
    const currentItemsCopy = [...items];
    const currentIndex = currentItemsCopy.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= currentItemsCopy.length) {
      return;
    }

    const [removed] = currentItemsCopy.splice(currentIndex, 1);
    currentItemsCopy.splice(targetIndex, 0, removed);

    const updatedItemsWithNewOrder = currentItemsCopy.map((reorderedItem, index) => ({
      ...reorderedItem,
      order_index: index,
    }));
    
    setItems(updatedItemsWithNewOrder);

    const loadingToastId = showLoading('Reordenando itens...');

    try {
      await updateAllCustomListItems(list.id, updatedItemsWithNewOrder);

      showSuccess('Ordem atualizada!');
      await loadItems();
      onItemSaved?.();
    } catch (error) {
      console.error('Erro ao reordenar itens:', error);
      showError('Erro ao reordenar itens.');
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const formatListText = () => {
    if (items.length === 0) return '';

    let formattedText = `${list.title}\n\n`;

    items.forEach(item => {
      if (item.type === 'separator') {
        formattedText += '--------------------\n';
        return;
      }
      if (item.type === 'subtitle') {
        formattedText += `\n--- ${item.item_name.toUpperCase()} ---\n`;
        return;
      }

      const quantidade = item.quantity;
      const nome = item.item_name || '';
      const codigo = item.part_code ? ` (Cód: ${item.part_code})` : '';
      const descricao = item.description || '';
      
      formattedText += `${quantidade} - ${nome} ${descricao}${codigo}`.trim() + '\n';
    });

    return formattedText.trim();
  };

  const handleCopyList = async () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    const textToCopy = formatListText();

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de peças copiada para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar a lista:', err);
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    exportDataAsCsv(items, `${list.title.replace(/\s/g, '_')}_itens.csv`);
    showSuccess('Lista exportada para CSV com sucesso!');
  };

  const handleExportPdf = () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    lazyGenerateCustomListPdf(items, list.title);
    showSuccess('PDF gerado com sucesso!');
  };

  // --- Drag and Drop Handlers (Itens da Lista Principal) ---
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, item: CustomListItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-t-2', 'border-primary');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-primary');
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, targetItem: CustomListItem) => {
    e.preventDefault();
    e.currentTarget.classList.remove('opacity-50');

    if (draggedItem && draggedItem.id !== targetItem.id) {
      const currentItemsCopy = [...items];
      const draggedIndex = currentItemsCopy.findIndex(item => item.id === draggedItem.id);
      const targetIndex = currentItemsCopy.findIndex(item => item.id === targetItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = currentItemsCopy.splice(draggedIndex, 1);
        currentItemsCopy.splice(targetIndex, 0, removed);
        
        const updatedItemsWithNewOrder = currentItemsCopy.map((reorderedItem, index) => ({
          ...reorderedItem,
          order_index: index,
        }));
        
        setItems(updatedItemsWithNewOrder);

        const loadingToastId = showLoading('Reordenando itens...');

        try {
          await updateAllCustomListItems(list.id, updatedItemsWithNewOrder);

          showSuccess('Ordem atualizada com sucesso!');
          await loadItems();
          onItemSaved?.();
        } catch (error) {
          console.error('Erro ao reordenar itens:', error);
          showError('Erro ao reordenar itens.');
        } finally {
          dismissToast(loadingToastId);
        }
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedItem(null);
  };
  // --- End Drag and Drop Handlers (Itens da Lista Principal) ---

  // --- Drag and Drop Handlers (Itens Relacionados) ---
  const handleRelatedDragStart = (e: React.DragEvent<HTMLDivElement>, item: string) => {
    setDraggedRelatedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleRelatedDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-primary');
  };

  const handleRelatedDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-primary');
  };

  const handleRelatedDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary');

    if (draggedRelatedItem && draggedRelatedItem !== targetItem) {
      const newRelatedItems = [...formItensRelacionados];
      const draggedIndex = newRelatedItems.findIndex(item => item === draggedRelatedItem);
      const targetIndex = newRelatedItems.findIndex(item => item === targetItem);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newRelatedItems.splice(draggedIndex, 1);
        newRelatedItems.splice(targetIndex, 0, removed);
        setFormItensRelacionados(newRelatedItems);
      }
    }
    setDraggedRelatedItem(null);
  };

  const handleRelatedDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedRelatedItem(null);
  };
  // --- End Drag and Drop Handlers (Itens Relacionados) ---

  const handleSaveGlobalPartName = async () => {
    if (!selectedPartFromSearch || !formPartCode) {
      showError('Nenhuma peça selecionada para atualizar o nome global.');
      return;
    }
  
    const currentGlobalName = selectedPartFromSearch.name || '';
    if (formItemName.trim() === currentGlobalName.trim()) {
      showError('O nome global não foi alterado.');
      return;
    }
  
    const loadingToastId = showLoading('Atualizando nome global da peça...');
    try {
      await updatePart({ ...selectedPartFromSearch, name: formItemName.trim() });
      showSuccess('Nome global da peça atualizado com sucesso!');
      setSelectedPartFromSearch(prev => prev ? { ...prev, name: formItemName.trim() } : null);
    } catch (error) {
      console.error('Erro ao atualizar nome global da peça:', error);
      showError('Erro ao atualizar nome global da peça.');
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const handleAddRelatedPart = (part: Part) => {
    const formattedPart = `${part.codigo} - ${part.name || part.descricao}`;
    if (!formItensRelacionados.includes(formattedPart)) {
      setFormItensRelacionados(prev => [...prev, formattedPart]);
      setRelatedSearchQuery('');
      setSearchResultsRelated([]);
      showSuccess(`Peça '${part.codigo}' adicionada aos itens relacionados.`);
    } else {
      showError(`Peça '${part.codigo}' já está na lista de itens relacionados.`);
    }
  };

  const handleRemoveRelatedPart = (formattedPartString: string) => {
    setFormItensRelacionados(prev => prev.filter(c => c !== formattedPartString));
    showSuccess(`Item '${formattedPartString.split(' - ')[0]}' removido dos itens relacionados.`);
  };

  const handleBulkAddRelatedParts = async () => {
    const codesToSearch = bulkRelatedPartsInput
      .split(';')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    if (codesToSearch.length === 0) {
      showError('Nenhum código válido encontrado para adicionar em massa.');
      return;
    }

    const loadingToastId = showLoading('Buscando e adicionando peças relacionadas...');
    const newRelatedItems: string[] = [];
    let foundCount = 0;

    for (const code of codesToSearch) {
      try {
        const results = await searchPartsService(code);
        const foundPart = results.find(p => p.codigo.toLowerCase() === code.toLowerCase());

        if (foundPart) {
          const formattedPart = `${foundPart.codigo} - ${foundPart.name || foundPart.descricao}`;
          if (!formItensRelacionados.includes(formattedPart) && !newRelatedItems.includes(formattedPart)) {
            newRelatedItems.push(formattedPart);
            foundCount++;
          }
        } else {
          console.warn(`Peça com código '${code}' não encontrada para adição em massa.`);
        }
      } catch (error) {
        console.error(`Erro ao buscar peça '${code}' para adição em massa:`, error);
      }
    }

    if (newRelatedItems.length > 0) {
      setFormItensRelacionados(prev => Array.from(new Set([...prev, ...newRelatedItems])));
      showSuccess(`${foundCount} peça(s) adicionada(s) em massa aos itens relacionados.`);
    } else {
      showError('Nenhuma nova peça válida encontrada ou adicionada em massa.');
    }
    setBulkRelatedPartsInput('');
    dismissToast(loadingToastId);
  };

  const getPartDescription = (formattedPartString: string): string => {
    return formattedPartString;
  };

  return (
    <React.Fragment>
      <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
        <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-2 mb-4 mt-8">
          <Link to="/custom-menu-view">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Catálogo
            </Button>
          </Link>
          {/* NOVO BOTÃO: Minha Lista de Peças */}
          <Link to="/parts-list">
            <Button variant="outline" className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" /> Minha Lista de Peças
            </Button>
          </Link>
        </div>
        
        <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex items-center gap-3">
          <ListIcon className="h-8 w-8 text-primary" />
          {listTitle}
        </h1>

        <Card className="w-full max-w-4xl mx-auto mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-center pt-2">
              Itens da Lista
            </CardTitle>
            <div className="flex flex-row flex-wrap items-center justify-end gap-2 pt-2">
              {selectedItemIds.size > 0 && (
                <Button 
                  onClick={handleExportSelectedToMyList} 
                  className="flex items-center gap-2 flex-1 sm:w-auto"
                  disabled={isLoadingAfs}
                >
                  <PlusCircle className="h-4 w-4" /> Exportar Selecionados ({selectedItemIds.size})
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleCopyList} 
                    disabled={items.length === 0} 
                    variant="secondary" 
                    size="icon"
                    className="sm:w-auto sm:px-4"
                  >
                    <Copy className="h-4 w-4" /> 
                    <span className="hidden sm:inline ml-2">Copiar Lista</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copiar Lista</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleExportCsv} 
                    disabled={items.length === 0} 
                    variant="outline" 
                    size="icon"
                    className="sm:w-auto sm:px-4"
                  >
                    <Download className="h-4 w-4" /> 
                    <span className="hidden sm:inline ml-2">Exportar CSV</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar CSV</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleExportPdf} disabled={items.length === 0} variant="default" className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" /> Exportar PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar PDF</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando itens da lista...</p>
            ) : items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum item nesta lista.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] p-2">
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={isIndeterminate ? true : undefined}
                          onCheckedChange={(checked) => handleSelectAll(checked === true)}
                          aria-label="Selecionar todos os itens"
                        />
                      </TableHead>
                      <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                      <TableHead className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead>
                      <TableHead className="w-[70px] p-2 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => renderItemRow(item))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <MadeWithDyad />

        {/* Sheet de Edição (mantido para o botão de lápis) */}
        <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Editar Item da Lista</SheetTitle>
              <SheetDescription>
                Edite os detalhes do item da lista.
              </SheetDescription>
            </SheetHeader>
            {itemToEdit && listId && (
              <CustomListEditor
                list={{ id: listId, title: listTitle, user_id: '' }}
                onClose={handleItemSavedOrClosed}
                editingItem={itemToEdit}
                onItemSaved={handleItemSavedOrClosed}
                allAvailableParts={[]} // Não é necessário carregar todas as peças aqui, mas a prop é obrigatória
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Sheet para Exportar Selecionados com AF */}
        <Sheet open={isExportSheetOpen} onOpenChange={setIsExportSheetOpen}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Exportar Itens para Minha Lista</SheetTitle>
              <SheetDescription>
                Selecione um AF (Número de Frota) para aplicar a todos os {selectedItemIds.size} itens selecionados antes de exportar para "Minha Lista de Peças".
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="af-for-export">AF (Número de Frota)</Label>
                {isLoadingAfs ? (
                  <Input value="Carregando AFs..." readOnly className="bg-muted" />
                ) : (
                  <AfSearchInput
                    value={afForExport}
                    onChange={setAfForExport}
                    availableAfs={allAvailableAfs}
                    onSelectAf={setAfForExport}
                  />
                )}
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsExportSheetOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmExport} disabled={!afForExport.trim() || isLoadingAfs}>
                <Check className="h-4 w-4 mr-2" /> Confirmar Exportação
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </React.Fragment>
  );
};

export default CustomListPage;