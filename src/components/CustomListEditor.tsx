"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal, ArrowUp, ArrowDown, GripVertical, Tag, Info, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part, RelatedPart } from '@/types/supabase';
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
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Importar Popover
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
import RelatedPartDisplay from './RelatedPartDisplay'; // Importado o novo componente
import { useSession } from './SessionContextProvider';

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
  editingItem?: CustomListItem | null;
  onItemSaved?: () => void;
  allAvailableParts: Part[];
}

const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose, editingItem, onItemSaved, allAvailableParts }) => {
  const { user } = useSession();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentEditingItemId, setCurrentEditingItemId] = useState<string | null>(null);

  // Form states for main item
  const [formType, setFormType] = useState<'item' | 'subtitle' | 'separator'>('item');
  const [formItemName, setFormItemName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formItensRelacionados, setFormItensRelacionados] = useState<RelatedPart[]>([]);
  
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
  const [draggedRelatedItem, setDraggedRelatedItem] = useState<RelatedPart | null>(null);

  // State to control if the form is for a new item or editing an existing one
  const [isFormForNewItem, setIsFormForNewItem] = useState(false);

  // State for related items popover
  const [openRelatedItemsPopoverId, setOpenRelatedItemsPopoverId] = useState<string | null>(null);

  const isMobile = useIsMobile();

  // Função auxiliar para formatar a string de exibição (CÓDIGO - NOME/DESCRIÇÃO)
  const formatRelatedPartObject = (part: Part): RelatedPart => {
    const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
    const subText = part.name && part.name.trim() !== '' && part.descricao !== mainText ? part.descricao : '';
    return { codigo: part.codigo, name: mainText, desc: subText };
  };

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

    // NOVO: Puxa os itens relacionados da peça principal (códigos)
    if (part.itens_relacionados && part.itens_relacionados.length > 0) {
      const relatedItems = part.itens_relacionados;
      
      // Adiciona os novos itens relacionados, mantendo os existentes (se houver)
      setFormItensRelacionados(prev => {
        const existingCodes = new Set(prev.map(p => p.codigo));
        const newItems = relatedItems.filter(p => !existingCodes.has(p.codigo));
        return [...prev, ...newItems];
      });
      showSuccess(`Sugestões de itens relacionados da peça ${part.codigo} carregadas.`);
    }
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

    const payload: Omit<CustomListItem, 'id'> = {
      type: formType,
      item_name: finalItemName,
      part_code: formType === 'item' ? trimmedPartCode || null : null,
      description: formType === 'item' ? trimmedDescription || null : null,
      quantity: formType === 'item' ? formQuantity : 0,
      // Se for edição, o order_index é mantido. Se for novo, usa o tamanho atual da lista.
      order_index: currentEditingItemId ? items.find(i => i.id === currentEditingItemId)?.order_index ?? items.length : items.length,
      itens_relacionados: formType === 'item' ? formItensRelacionados : [],
    };

    try {
      if (currentEditingItemId) {
        // Modo de edição: usa o ID do item em edição
        await updateCustomListItem(list.id, { id: currentEditingItemId, ...payload });
        showSuccess('Item atualizado com sucesso!');
      } else {
        // Modo de adição: adiciona um novo item
        await addCustomListItem(list.id, payload);
        showSuccess('Item adicionado com sucesso!');
      }
      
      resetForm();
      setCurrentEditingItemId(null); // Limpa o ID após salvar
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
    const siblings = [...items];
    const currentIndex = siblings.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
  
    // Reordena o array localmente
    const [removed] = siblings.splice(currentIndex, 1);
    siblings.splice(targetIndex, 0, removed);
  
    // Re-indexa o array inteiro para garantir consistência
    const updatedItemsWithNewOrder = siblings.map((reorderedItem, index) => ({
      ...reorderedItem,
      order_index: index,
    }));
  
    // Atualiza a UI imediatamente para feedback visual
    setItems(updatedItemsWithNewOrder);
  
    const loadingToastId = showLoading('Reordenando itens...');
  
    try {
      // Envia o array completo e re-indexado para o Supabase em uma única operação
      await updateAllCustomListItems(list.id, updatedItemsWithNewOrder);
  
      showSuccess('Ordem atualizada!');
      await loadItems(); // Recarrega do Supabase para garantir consistência
      onItemSaved?.();
    } catch (error) {
      console.error('Erro ao reordenar itens:', error);
      showError('Erro ao reordenar itens.');
      // Reverte a UI para o estado anterior em caso de erro
      loadItems();
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
  const handleRelatedDragStart = (e: React.DragEvent<HTMLDivElement>, item: RelatedPart) => {
    setDraggedRelatedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.codigo);
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

  const handleRelatedDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: RelatedPart) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary');

    if (draggedRelatedItem && draggedRelatedItem.codigo !== targetItem.codigo) {
      const newRelatedItems = [...formItensRelacionados];
      const draggedIndex = newRelatedItems.findIndex(item => item.codigo === draggedRelatedItem.codigo);
      const targetIndex = newRelatedItems.findIndex(item => item.codigo === targetItem.codigo);

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
    const relatedPartObject = formatRelatedPartObject(part);
    if (!formItensRelacionados.some(p => p.codigo === relatedPartObject.codigo)) {
      setFormItensRelacionados(prev => [...prev, relatedPartObject]);
      setRelatedSearchQuery('');
      setSearchResultsRelated([]);
      showSuccess(`Peça '${part.codigo}' adicionada aos itens relacionados.`);
    } else {
      showError(`Peça '${part.codigo}' já está na lista de itens relacionados.`);
    }
  };

  const handleRemoveRelatedPart = (codigo: string) => {
    setFormItensRelacionados(prev => prev.filter(p => p.codigo !== codigo));
    showSuccess(`Item ${codigo} removido dos itens relacionados.`);
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
    const newRelatedItems: RelatedPart[] = [];
    let foundCount = 0;

    for (const code of codesToSearch) {
      const foundPart = allAvailableParts.find(p => p.codigo.toLowerCase() === code.toLowerCase());

      if (foundPart) {
        const relatedPartObject = formatRelatedPartObject(foundPart);
        if (!formItensRelacionados.some(p => p.codigo === relatedPartObject.codigo) && !newRelatedItems.some(p => p.codigo === relatedPartObject.codigo)) {
          newRelatedItems.push(relatedPartObject);
          foundCount++;
        }
      } else {
        const pureCodeObject = { codigo: code, name: code, desc: '' };
        if (!formItensRelacionados.some(p => p.codigo === pureCodeObject.codigo) && !newRelatedItems.some(p => p.codigo === pureCodeObject.codigo)) {
          newRelatedItems.push(pureCodeObject);
          foundCount++;
        }
      }
    }

    if (newRelatedItems.length > 0) {
      setFormItensRelacionados(prev => Array.from(new Set([...prev, ...newRelatedItems])));
      showSuccess(`${foundCount} item(s) adicionado(s) em massa aos itens relacionados.`);
    } else {
      showError('Nenhum novo item válido encontrado ou adicionado em massa.');
    }
    setBulkRelatedPartsInput('');
    dismissToast(loadingToastId);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2 shrink-0">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleAdd} className="flex items-center gap-2 shrink-0">
            <PlusCircle className="h-4 w-4" /> Novo Item
          </Button>
        </div>
        
        <CardTitle className="text-2xl font-bold text-center pt-2">
          {list.title}
        </CardTitle>
        
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
                  <TableHead className="w-[30px] p-2">
                    <GripVertical className="h-4 w-4" />
                  </TableHead>
                  <TableHead className="w-[3rem] p-2">Qtd</TableHead>
                  <TableHead className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead>
                  <TableHead className="w-[70px] p-2 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const isSeparator = item.type === 'separator';
                  const isSubtitle = item.type === 'subtitle';
                  
                  if (isSeparator) {
                    return (
                      <TableRow key={item.id} className="bg-muted/50 border-y-2 border-dashed" draggable onDragStart={(e) => handleDragStart(e, item)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, item)} onDragLeave={handleDragLeave} onDragEnd={handleDragEnd} data-id={item.id}>
                        <TableCell className="w-[30px] p-2 cursor-grab"><GripVertical className="h-4 w-4" /></TableCell>
                        <TableCell colSpan={2} className="text-center font-mono text-sm font-bold text-foreground italic p-2">
                          <Separator className="my-0 bg-foreground/50 h-px" />
                        </TableCell>
                        <TableCell className="w-[70px] p-2 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleMoveItem(item, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mover para Cima</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleMoveItem(item, 'down')} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mover para Baixo</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar Item</TooltipContent></Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação irá remover o separador. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (isSubtitle) {
                    return (
                      <TableRow key={item.id} className="bg-accent/10 hover:bg-accent/50 border-y-2 border-primary/50" draggable onDragStart={(e) => handleDragStart(e, item)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, item)} onDragLeave={handleDragLeave} onDragEnd={handleDragEnd} data-id={item.id}>
                        <TableCell className="w-[30px] p-2 cursor-grab"><GripVertical className="h-4 w-4" /></TableCell>
                        <TableCell colSpan={2} className="text-left font-bold text-lg text-primary p-2">
                          {item.item_name}
                        </TableCell>
                        <TableCell className="w-[70px] p-2 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleMoveItem(item, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mover para Cima</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleMoveItem(item, 'down')} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mover para Baixo</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar Item</TooltipContent></Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação irá remover o subtítulo "{item.item_name}". Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Item de peça normal
                  return (
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
                    >
                      <TableCell className="w-[30px] p-2 cursor-grab">
                        <GripVertical className="h-4 w-4" />
                      </TableCell>
                      <TableCell className="font-medium p-2 text-center">{item.quantity}</TableCell>
                      <TableCell className="w-auto whitespace-normal break-words p-2 text-left">
                          <div className="flex flex-col items-start">
                            {item.part_code && (
                              <span className="font-medium text-sm text-primary whitespace-normal break-words">{item.part_code}</span>
                            )}
                            <span className={cn("text-sm whitespace-normal break-words", !item.part_code && 'font-medium')}>{item.item_name}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground italic max-w-full whitespace-normal break-words">{item.description}</span>
                            )}
                            {item.itens_relacionados && item.itens_relacionados.length > 0 && (
                              <Popover 
                                key={`popover-${item.id}`}
                                open={openRelatedItemsPopoverId === item.id} 
                                onOpenChange={(open) => setOpenRelatedItemsPopoverId(open ? item.id : null)}
                                modal={false}
                              >
                                <PopoverTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 cursor-pointer h-auto py-0 px-1"
                                  >
                                    <Tag className="h-3 w-3" /> {item.itens_relacionados.length} item(s) relacionado(s)
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto max-w-xs p-2">
                                  <p className="font-bold mb-1 text-sm">Itens Relacionados:</p>
                                  <ScrollArea className={isMobile ? "h-24" : "max-h-96"}>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                      {item.itens_relacionados.map(rel => (
                                        <li key={rel.codigo} className="list-none ml-0">
                                          <RelatedPartDisplay item={rel} />
                                        </li>
                                      ))}
                                    </ul>
                                  </ScrollArea>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                      </TableCell>
                      <TableCell className="w-[70px] p-2 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleMoveItem(item, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mover para Cima</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleMoveItem(item, 'down')} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mover para Baixo</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar Item</TooltipContent></Tooltip>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação irá remover o item "{item.item_name}". Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Formulário de Adicionar/Editar Item */}
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <h3 className="text-xl font-semibold">
          {currentEditingItemId ? 'Editar Item' : 'Adicionar Novo Item'}
        </h3>
        
        <div className="space-y-2">
          <Label htmlFor="item-type">Tipo de Item</Label>
          <Select
            value={formType}
            onValueChange={(value: 'item' | 'subtitle' | 'separator') => {
              setFormType(value);
              // Limpa campos irrelevantes ao mudar o tipo
              if (value !== 'item') {
                setFormPartCode('');
                setFormDescription('');
                setFormQuantity(0);
                setFormItensRelacionados([]);
                setSelectedPartFromSearch(null);
              }
              if (value === 'separator') {
                setFormItemName('--- SEPARADOR ---');
              } else if (value === 'subtitle') {
                setFormItemName('');
              }
            }}
          >
            <SelectTrigger id="item-type">
              <SelectValue placeholder="Selecione o Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="item">Item de Peça</SelectItem>
              <SelectItem value="subtitle">Subtítulo</SelectItem>
              <SelectItem value="separator">Separador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formType !== 'separator' && (
          <div className="space-y-2">
            <Label htmlFor="item-name">
              {formType === 'subtitle' ? 'Texto do Subtítulo' : 'Nome Personalizado'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="item-name"
                value={formItemName}
                onChange={(e) => setFormItemName(e.target.value)}
                placeholder={formType === 'subtitle' ? 'Ex: Peças do Motor' : 'Ex: Kit de Reparo do Motor'}
                className="flex-1"
                required={formType === 'item' || formType === 'subtitle'}
              />
              {formPartCode && formType === 'item' && ( 
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleSaveGlobalPartName}
                      disabled={
                        !selectedPartFromSearch || 
                        formItemName.trim().toLowerCase() === (selectedPartFromSearch.name || selectedPartFromSearch.descricao || '').trim().toLowerCase() ||
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
        )}

        {formType === 'item' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="search-part">Buscar Peça (Opcional)</Label>
              <PartSearchInput
                onSearch={setSearchQuery}
                searchResults={searchResults}
                onSelectPart={handleSelectPart}
                searchQuery={searchQuery}
                isLoading={isLoadingParts}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="part-code">Cód. Peça (Opcional)</Label>
                <Input
                  id="part-code"
                  value={formPartCode}
                  onChange={(e) => setFormPartCode(e.target.value)}
                  placeholder="Código da peça"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2 md:col-span-1">
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição da peça"
                className="w-full"
              />
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Itens Relacionados (Códigos de Peça)
              </Label>
              <PartSearchInput
                onSearch={setRelatedSearchQuery}
                searchResults={relatedSearchResults}
                onSelectPart={handleAddRelatedPart}
                searchQuery={relatedSearchQuery}
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
              <ScrollArea className={cn("w-full rounded-md border p-2", isMobile ? "h-24" : "max-h-96")}>
                {formItensRelacionados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item relacionado adicionado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formItensRelacionados.map((item, index) => (
                      <div 
                        key={item.codigo} 
                        className={cn(
                          "flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full border border-transparent cursor-grab",
                          draggedRelatedItem?.codigo === item.codigo && 'opacity-50',
                          draggedRelatedItem && 'hover:border-primary'
                        )}
                        draggable
                        onDragStart={(e) => handleRelatedDragStart(e, item)}
                        onDragOver={handleRelatedDragOver}
                        onDrop={(e) => handleRelatedDrop(e, item)}
                        onDragLeave={handleRelatedDragLeave}
                        onDragEnd={handleRelatedDragEnd}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <GripVertical className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            <RelatedPartDisplay item={item} />
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 text-destructive shrink-0"
                          onClick={() => handleRemoveRelatedPart(item.codigo)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                Arraste e solte os códigos acima para reordenar.
              </p>
            </div>
          </>
        )}

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            <XCircle className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" /> {currentEditingItemId ? 'Salvar Alterações' : 'Adicionar Item'}
          </Button>
        </SheetFooter>
      </form>
    </Card>
  );
};

export default CustomListEditor;