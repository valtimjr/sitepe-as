/** @jsxImportSource react */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet'; // Importar Sheet e SheetDescription
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal, ArrowUp, ArrowDown, GripVertical, Tag, Info, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part } from '@/types/supabase';
import { getCustomListItems, addCustomListItem, updateCustomListItem, deleteCustomListItem, deleteCustomListItem as deleteCustomListItemService } from '@/services/customListService';
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
import PartSearchInput from './PartSearchInput';
import { getParts, searchParts as searchPartsService, updatePart } from '@/services/partListService';
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { generateCustomListPdf } from '@/lib/pdfGenerator';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea'; // Importar Textarea

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
  editingItem?: CustomListItem | null;
  onItemSaved?: () => void; // Tornada opcional
}

const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose, editingItem, onItemSaved }) => {
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Renomeado para clareza
  const [currentEditItem, setCurrentEditItem] = useState<CustomListItem | null>(null);
  
  // Form states for main item
  const [formItemName, setFormItemName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formItensRelacionados, setFormItensRelacionados] = useState<string[]>([]); // Novo estado
  
  // Search states for main item form
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [selectedPartFromSearch, setSelectedPartFromSearch] = useState<Part | null>(null);

  // Search states for related items form
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [relatedSearchResults, setSearchResultsRelated] = useState<Part[]>([]);

  // Bulk add related items state
  const [bulkRelatedPartsInput, setBulkRelatedPartsInput] = useState('');

  // Drag and Drop states
  const [draggedItem, setDraggedItem] = useState<CustomListItem | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedItems = await getCustomListItems(list.id);
      setItems(fetchedItems);
    } catch (error) {
      showError('Erro ao carregar itens da lista.');
      console.error('Failed to load custom list items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [list.id]);

  const loadParts = useCallback(async () => {
    setIsLoadingParts(true);
    try {
      const parts = await getParts();
      setAllAvailableParts(parts);
    } catch (error) {
      console.error('Failed to load all parts:', error);
    } finally {
      setIsLoadingParts(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadParts();
  }, [loadItems, loadParts]);

  // Efeito para preencher o formulário quando `editingItem` muda
  useEffect(() => {
    const initializeFormForEdit = async () => {
      if (editingItem) {
        setCurrentEditItem(editingItem);
        setFormItemName(editingItem.item_name);
        setFormPartCode(editingItem.part_code || '');
        setFormDescription(editingItem.description || '');
        setFormQuantity(editingItem.quantity);
        setFormItensRelacionados(editingItem.itens_relacionados || []); // Preenche itens relacionados
        setSearchQuery('');
        setSearchResults([]);
        setBulkRelatedPartsInput(''); // Limpa o campo de bulk
        setRelatedSearchQuery(''); // Limpa a query de busca relacionada
        setSearchResultsRelated([]); // Limpa os resultados de busca relacionada

        if (editingItem.part_code) {
          const parts = await getParts(editingItem.part_code); 
          if (parts.length === 1 && parts[0].codigo === editingItem.part_code) {
            setSelectedPartFromSearch(parts[0]);
          } else {
            setSelectedPartFromSearch(null);
          }
        } else {
          setSelectedPartFromSearch(null);
        }
        setIsSheetOpen(true);
      } else {
        resetForm();
        setSelectedPartFromSearch(null);
      }
    };

    initializeFormForEdit();
  }, [editingItem, allAvailableParts]);


  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
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

  // Efeito para a busca de peças relacionadas
  useEffect(() => {
    const fetchRelatedSearchResults = async () => {
      if (relatedSearchQuery.length > 1) {
        setIsLoadingParts(true);
        const results = await searchPartsService(relatedSearchQuery);
        setSearchResultsRelated(results);
        setIsLoadingParts(false);
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
    setCurrentEditItem(null);
    setFormItemName('');
    setFormPartCode('');
    setFormDescription('');
    setFormQuantity(1);
    setFormItensRelacionados([]); // Limpa itens relacionados
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPartFromSearch(null);
    setBulkRelatedPartsInput(''); // Limpa o campo de bulk
    setRelatedSearchQuery(''); // Limpa a query de busca relacionada
    setSearchResultsRelated([]); // Limpa os resultados de busca relacionada
  };

  const handleAdd = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  const handleEdit = (item: CustomListItem) => {
    setCurrentEditItem(item);
    setFormItemName(item.item_name);
    setFormPartCode(item.part_code || '');
    setFormDescription(item.description || '');
    setFormQuantity(item.quantity);
    setFormItensRelacionados(item.itens_relacionados || []); // Preenche itens relacionados
    setSearchQuery('');
    setSearchResults([]);
    setBulkRelatedPartsInput(''); // Limpa o campo de bulk
    setRelatedSearchQuery(''); // Limpa a query de busca relacionada
    setSearchResultsRelated([]); // Limpa os resultados de busca relacionada
    setIsSheetOpen(true);
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

    if (formQuantity <= 0) {
      showError('A quantidade deve ser maior que zero.');
      return;
    }

    if (!trimmedItemName && !trimmedDescription) {
      showError('O Nome ou a Descrição da Peça deve ser preenchido.');
      return;
    }

    const finalItemName = trimmedItemName || trimmedDescription;

    const payload: Omit<CustomListItem, 'id'> = {
      list_id: list.id, // list_id é necessário para o serviço
      item_name: finalItemName,
      part_code: trimmedPartCode || null,
      description: trimmedDescription || null,
      quantity: formQuantity,
      order_index: currentEditItem?.order_index ?? 0, // Mantém a ordem ou define 0 para novo
      itens_relacionados: formItensRelacionados, // Inclui o novo campo
    };

    try {
      if (currentEditItem) {
        await updateCustomListItem({ ...currentEditItem, ...payload });
        showSuccess('Item atualizado com sucesso!');
      } else {
        await addCustomListItem(payload);
        showSuccess('Item adicionado com sucesso!');
      }
      
      setIsSheetOpen(false);
      loadItems();
      onItemSaved?.(); // Usando encadeamento opcional
    } catch (error) {
      showError('Erro ao salvar item.');
      console.error('Failed to save item:', error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteCustomListItemService(list.id, itemId); // Passa list.id
      showSuccess('Item excluído com sucesso!');
      loadItems();
      onItemSaved?.(); // Usando encadeamento opcional
    } catch (error) {
      showError('Erro ao excluir item.');
      console.error('Failed to delete item:', error);
    }
  };

  const handleMoveItem = async (item: CustomListItem, direction: 'up' | 'down') => {
    const siblings = items.filter(i => i.list_id === item.list_id).sort((a, b) => a.order_index - b.order_index);
    const currentIndex = siblings.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const currentItem = siblings[currentIndex];
    const targetItem = siblings[targetIndex];

    if (!currentItem || !targetItem) return;

    const loadingToastId = showLoading('Reordenando itens...');

    try {
      await Promise.all([
        updateCustomListItem({ ...currentItem, order_index: targetItem.order_index }),
        updateCustomListItem({ ...targetItem, order_index: currentItem.order_index }),
      ]);

      showSuccess('Ordem atualizada!');
      await loadItems();
      onItemSaved?.(); // Usando encadeamento opcional
    } catch (error) {
      showError('Erro ao reordenar itens.');
      console.error('Failed to reorder list items:', error);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const formatListText = () => {
    if (items.length === 0) return '';

    let formattedText = `${list.title}\n\n`; // Adiciona o título da lista aqui

    items.forEach(item => {
      const quantidade = item.quantity;
      const nome = item.item_name || '';
      const codigo = item.part_code ? ` (Cód: ${item.part_code})` : '';
      const descricao = item.description || '';
      
      // Formato: [QUANTIDADE] - [NOME PERSONALIZADO] [DESCRIÇÃO] (Cód: [CÓDIGO])
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
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
      console.error('Failed to copy list items:', err);
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
    generateCustomListPdf(items, list.title);
    showSuccess('PDF gerado com sucesso!');
  };

  // --- Drag and Drop Handlers ---
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
      const newOrderedItems = [...items];
      const draggedIndex = newOrderedItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newOrderedItems.findIndex(item => item.id === targetItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newOrderedItems.splice(draggedIndex, 1);
        newOrderedItems.splice(targetIndex, 0, removed);
        
        setItems(newOrderedItems);

        const loadingToastId = showLoading('Reordenando itens...');
        try {
          const updatePromises = newOrderedItems.map((item, index) => 
            updateCustomListItem({ ...item, order_index: index })
          );
          await Promise.all(updatePromises);
          showSuccess('Ordem atualizada com sucesso!');
          await loadItems();
          onItemSaved?.(); // Usando encadeamento opcional
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

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedItem(null);
  };
  // --- End Drag and Drop Handlers ---

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
      await loadParts();
      setSelectedPartFromSearch(prev => prev ? { ...prev, name: formItemName.trim() } : null);
    } catch (error) {
      showError('Erro ao atualizar nome global da peça.');
      console.error('Failed to update global part name:', error);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const handleAddRelatedPart = (part: Part) => {
    if (!formItensRelacionados.includes(part.codigo)) {
      setFormItensRelacionados(prev => [...prev, part.codigo]);
      setRelatedSearchQuery(''); // Limpa o campo de busca relacionada
      setSearchResultsRelated([]); // Limpa os resultados relacionados
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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        {/* Linha 1: Botões de Ação Rápida (Voltar e Adicionar Item) */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2 shrink-0">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleAdd} className="flex items-center gap-2 shrink-0">
            <PlusCircle className="h-4 w-4" /> Item
          </Button>
        </div>
        
        {/* Linha 2: Título da Lista (Centralizado) */}
        <CardTitle className="text-2xl font-bold text-center pt-2">
          {list.title}
        </CardTitle>
        
        {/* Linha 3: Botões de Exportação/Cópia */}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
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
                <FileText className="h-4 w-4" /> Exportar PDF
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
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableHead>
                  <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                  <TableHead className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    data-id={item.id}
                    className="relative"
                  ><TableCell className="w-[40px] p-2 cursor-grab">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium p-2 text-center">{item.quantity}</TableCell>
                    <TableCell className="w-auto whitespace-normal break-words p-2">
                        <div className="flex flex-col">
                          {item.part_code && (
                            <span className="font-medium text-sm text-primary">{item.part_code}</span>
                          )}
                          <span className={cn("text-sm", !item.part_code && 'font-medium')}>{item.item_name}</span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-full">{item.description}</span>
                          )}
                          {item.itens_relacionados && item.itens_relacionados.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 cursor-help">
                                  <Tag className="h-3 w-3" /> {item.itens_relacionados.length} item(s) relacionado(s)
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-bold mb-1">Itens Relacionados:</p>
                                <ul className="list-disc list-inside">
                                  {item.itens_relacionados.map(rel => <li key={rel}>{rel}</li>)}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                    </TableCell>
                    <TableCell className="w-[120px] p-2 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleMoveItem(item, 'up')}
                              disabled={index === 0}
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
                              disabled={index === items.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mover para Baixo</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Item</TooltipContent>
                        </Tooltip>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá remover o item "{item.item_name}" da lista. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Sheet Principal para Adicionar/Editar Item */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{currentEditItem ? 'Editar Item' : 'Adicionar Novo Item'}</SheetTitle>
            <SheetDescription>
              {currentEditItem ? 'Edite os detalhes do item da lista.' : 'Adicione um novo item à lista personalizada.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-part">Buscar Peça (Opcional)</Label>
              <PartSearchInput
                onSearch={setSearchQuery}
                searchResults={searchResults}
                onSelectPart={handleSelectPart}
                searchQuery={searchQuery}
                allParts={allAvailableParts}
                isLoading={isLoadingParts}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="space-y-2 md:col-span-2"> {/* Nome Personalizado: maior */}
                <Label htmlFor="item-name">Nome Personalizado</Label> {/* Rótulo encurtado */}
                <div className="flex items-center gap-2">
                  <Input
                    id="item-name"
                    value={formItemName}
                    onChange={(e) => setFormItemName(e.target.value)}
                    placeholder="Ex: Kit de Reparo do Motor"
                    className="flex-1"
                  />
                  {formPartCode && ( 
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleSaveGlobalPartName}
                          disabled={
                            !selectedPartFromSearch || 
                            formItemName.trim() === (selectedPartFromSearch.name || selectedPartFromSearch.descricao || '').trim() ||
                            !formItemName.trim()
                          }
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Salvar este nome como o nome global da peça "{selectedPartFromSearch?.codigo || 'N/A'}"
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-1"> {/* Código da Peça: menor */}
                <Label htmlFor="part-code">Cód. Peça (Opcional)</Label> {/* Rótulo encurtado */}
                <Input
                  id="part-code"
                  value={formPartCode}
                  onChange={(e) => setFormPartCode(e.target.value)}
                  placeholder="Código da peça"
                  className="w-full"
                />
              </div>
            </div> {/* End grid-cols-1 md:grid-cols-3 for name/part-code */}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="space-y-2 md:col-span-2"> {/* Descrição: maior */}
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Input
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição da peça"
                  className="w-full"
                />
              </div>

              <div className="space-y-2 md:col-span-1"> {/* Quantidade: menor */}
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  required
                  className="w-full"
                />
              </div>
            </div> {/* End grid-cols-1 md:grid-cols-3 for description/quantity */}

            {/* Seção de Itens Relacionados */}
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Itens Relacionados (Códigos de Peça)
              </Label>
              <PartSearchInput
                onSearch={setRelatedSearchQuery}
                searchResults={relatedSearchResults}
                onSelectPart={handleAddRelatedPart}
                searchQuery={relatedSearchQuery}
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
                Adicione códigos de peças que estão relacionadas a este item da lista.
              </p>
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default CustomListEditor;