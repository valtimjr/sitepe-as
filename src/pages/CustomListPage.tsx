"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, List as ListIcon, Copy, Download, FileText, Edit, Tag, Info, Check, PlusCircle, XCircle, FileDown, Minus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { getCustomListItems, getCustomListById, updateAllCustomListItems } from '@/services/customListService';
import { CustomList, CustomListItem, Part, RelatedPart } from '@/types/supabase';
import { exportDataAsCsv, exportDataAsJson, addSimplePartItem, getAfsFromService, Af, getParts } from '@/services/partListService';
import { lazyGenerateCustomListPdf } from '@/utils/pdfExportUtils'; // Importar a função lazy
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import CustomListEditor from '@/components/CustomListEditor';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import AfSearchInput from '@/components/AfSearchInput';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile'; // Importar o hook useIsMobile
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Importar Popover
import { Separator } from '@/components/ui/separator';
import RelatedPartDisplay from '@/components/RelatedPartDisplay'; // Importado o novo componente
import { ScrollArea } from '@/components/ui/scroll-area';
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
import CustomListItemForm from '@/components/CustomListItemForm'; // Importar o formulário de item

const CustomListPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const location = useLocation();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [listTitle, setListTitle] = useState('Carregando Lista...');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CustomListItem | null>(null);

  // Estados para seleção e exportação
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [afForExport, setAfForExport] = useState('');
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]); // Adicionado para passar ao editor

  // Estado para controlar o Popover de itens relacionados
  const [openRelatedItemsPopoverId, setOpenRelatedItemsPopoverId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<CustomListItem | null>(null);

  const isMobile = useIsMobile(); // Usar o hook useIsMobile

  const loadList = useCallback(async () => {
    if (!listId) {
      return; // Adicionado para evitar chamadas desnecessárias
    }
    setIsLoading(true);
    try {
      const listData = await getCustomListById(listId);
      if (listData) {
        setListTitle(listData.title);
      } else {
        setListTitle('Lista Não Encontrada');
        showError('Lista não encontrada ou você não tem permissão para acessá-la.');
        setIsLoading(false);
        return;
      }

      const fetchedItems = await getCustomListItems(listId);
      setItems(fetchedItems);
    } catch (error) {
      console.error('Erro ao carregar a lista personalizada:', error);
      showError('Erro ao carregar a lista personalizada.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  const loadAfsAndParts = useCallback(async () => {
    setIsLoadingAfs(true);
    try {
      const [afs, parts] = await Promise.all([getAfsFromService(), getParts()]);
      setAllAvailableAfs(afs);
      setAllAvailableParts(parts);
    } catch (error) {
      console.error('Erro ao carregar AFs e Peças:', error);
    } finally {
      setIsLoadingAfs(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    loadAfsAndParts();
  }, [loadList, loadAfsAndParts]);

  useEffect(() => {
    document.title = `${listTitle} - AutoBoard`;
  }, [listTitle]);

  // Efeito para rolar para a âncora
  useEffect(() => {
    if (!isLoading && location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100); // Pequeno atraso para garantir que a renderização esteja completa
      }
    }
  }, [isLoading, location.hash, items]);

  const formatListText = (itemsToFormat: CustomListItem[]) => {
    if (itemsToFormat.length === 0) return '';

    let formattedText = `${listTitle}\n\n`;

    itemsToFormat.forEach(item => {
      if (item.type === 'separator') {
        formattedText += '--------------------\n';
        return;
      }
      if (item.type === 'subtitle') {
        formattedText += `\n--- ${item.item_name.toUpperCase()} ---\n`;
        return;
      }
      
      if (item.type === 'mangueira' && item.mangueira_data) {
        const data = item.mangueira_data;
        formattedText += `1 - Mangueira: ${data.mangueira.name || data.mangueira.codigo} (Cód: ${data.mangueira.codigo}) - Corte: ${data.corte_cm} cm\n`;
        formattedText += `    Conexão 1: ${data.conexao1.name || data.conexao1.codigo} (Cód: ${data.conexao1.codigo})\n`;
        formattedText += `    Conexão 2: ${data.conexao2.name || data.conexao2.codigo} (Cód: ${data.conexao2.codigo})\n`;
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
    const itemsToProcess = selectedItemIds.size > 0
      ? items.filter(item => selectedItemIds.has(item.id))
      : items;

    if (itemsToProcess.length === 0) {
      showError('A lista está vazia ou nenhum item selecionado para copiar.');
      return;
    }

    const textToCopy = formatListText(itemsToProcess);

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de peças copiada para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar a lista:', err);
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
    }
  };

  const handleExportCsv = () => {
    const itemsToExport = selectedItemIds.size > 0
      ? items.filter(item => selectedItemIds.has(item.id))
      : items;

    if (itemsToExport.length === 0) {
      showError('Nenhum item para exportar.');
      return;
    }
    exportDataAsCsv(itemsToExport, `${listTitle.replace(/\s/g, '_')}_itens.csv`);
    showSuccess('Lista exportada para CSV com sucesso!');
  };

  const handleExportPdf = async () => {
    const itemsToExport = selectedItemIds.size > 0
      ? items.filter(item => selectedItemIds.has(item.id))
      : items;

    if (itemsToExport.length === 0) {
      showError('Nenhum item para exportar.');
      return;
    }
    await lazyGenerateCustomListPdf(itemsToExport, listTitle);
    showSuccess('PDF gerado com sucesso!');
  };

  const handleEditItemClick = (item: CustomListItem) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleItemSavedOrClosed = () => {
    setIsEditModalOpen(false);
    setItemToEdit(null);
    loadList();
  };

  // --- Seleção de Itens ---
  const selectableItems = useMemo(() => items.filter(i => i.type === 'item' || i.type === 'mangueira'), [items]);
  const isAllSelected = selectableItems.length > 0 && selectedItemIds.size === selectableItems.length;
  const isIndeterminate = selectedItemIds.size > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      const allItemIds = new Set(selectableItems.map(item => item.id));
      setSelectedItemIds(allItemIds);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedItemIds(prev => {
      const newSelection = new Set(prev);
      if (checked) {
        newSelection.add(id);
      } else {
        newSelection.delete(id);
      }
      return newSelection;
    });
  };

  const handleSubtitleSelect = (subtitleItem: CustomListItem, isChecked: boolean) => {
    const startIndex = items.findIndex(i => i.id === subtitleItem.id);
    if (startIndex === -1) return;

    let endIndex = items.findIndex((i, idx) => idx > startIndex && i.type === 'subtitle');
    if (endIndex === -1) {
      endIndex = items.length;
    }

    const itemsInGroup = items.slice(startIndex, endIndex);
    const selectableIdsInGroup = itemsInGroup
      .filter(i => i.type === 'item' || i.type === 'mangueira')
      .map(item => item.id);

    setSelectedItemIds(prev => {
      const newSelection = new Set(prev);
      if (isChecked) {
        selectableIdsInGroup.forEach(id => newSelection.add(id));
      } else {
        selectableIdsInGroup.forEach(id => newSelection.delete(id));
      }
      return newSelection;
    });
  };

  // --- Exportar Selecionados para Minha Lista ---
  const handleExportSelectedToMyList = () => {
    if (selectedItemIds.size === 0) {
      showError('Nenhum item selecionado para exportar.');
      return;
    }
    setAfForExport(''); // Limpa o AF anterior
    setIsExportSheetOpen(true);
  };

  const handleConfirmExport = async () => {
    if (!afForExport.trim()) {
      showError('Por favor, selecione um AF para os itens exportados.');
      return;
    }

    const itemsToExport = items.filter(item => selectedItemIds.has(item.id));
    if (itemsToExport.length === 0) {
      showError('Nenhum item selecionado para exportar.');
      return;
    }

    const loadingToastId = showLoading(`Exportando ${itemsToExport.length} itens...`);
    try {
      for (const item of itemsToExport) {
        if (item.type === 'mangueira' && item.mangueira_data) {
          const data = item.mangueira_data;
          
          // Exporta a Mangueira como item simples (1 unidade)
          await addSimplePartItem({
            codigo_peca: data.mangueira.codigo || '',
            descricao: `Mangueira: ${data.mangueira.name || data.mangueira.codigo} - Corte: ${data.corte_cm} cm`,
            quantidade: 1,
            af: afForExport.trim(),
          });

          // Exporta Conexão 1
          await addSimplePartItem({
            codigo_peca: data.conexao1.codigo || '',
            descricao: `Conexão 1: ${data.conexao1.name || data.conexao1.codigo}`,
            quantidade: 1,
            af: afForExport.trim(),
          });

          // Exporta Conexão 2
          await addSimplePartItem({
            codigo_peca: data.conexao2.codigo || '',
            descricao: `Conexão 2: ${data.conexao2.name || data.conexao2.codigo}`,
            quantidade: 1,
            af: afForExport.trim(),
          });

        } else if (item.type === 'item') {
          await addSimplePartItem({
            codigo_peca: item.part_code || '',
            descricao: item.description || item.item_name,
            quantidade: item.quantity,
            af: afForExport.trim(),
          });
        }
      }
      showSuccess(`${itemsToExport.length} item(s) exportado(s) para 'Minha Lista de Peças' com sucesso!`);
      setSelectedItemIds(new Set());
      setIsExportSheetOpen(false);
      setAfForExport('');
    } catch (error) {
      console.error('Erro ao exportar itens:', error);
      showError(`Erro ao exportar itens para 'Minha Lista de Peças'.`);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const handleDelete = async (itemId: string) => {
    // Esta função é necessária para o AlertDialog
    showError('A exclusão de itens deve ser feita no Gerenciador de Menus e Listas.');
  };

  const handleMoveItem = async (item: CustomListItem, direction: 'up' | 'down') => {
    const siblings = [...items];
    const currentIndex = siblings.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
  
    const [removed] = siblings.splice(currentIndex, 1);
    siblings.splice(targetIndex, 0, removed);
  
    const updatedItemsWithNewOrder = siblings.map((reorderedItem, index) => ({
      ...reorderedItem,
      order_index: index,
    }));
    
    setItems(updatedItemsWithNewOrder);

    const loadingToastId = showLoading('Reordenando itens...');

    try {
      if (!listId) throw new Error("List ID is missing");
      await updateAllCustomListItems(listId, updatedItemsWithNewOrder);
      showSuccess('Ordem atualizada!');
      await loadList();
    } catch (error) {
      console.error('Erro ao reordenar itens:', error);
      showError('Erro ao reordenar itens.');
      loadList();
    } finally {
      dismissToast(loadingToastId);
    }
  };

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
          if (!listId) throw new Error("List ID is missing");
          await updateAllCustomListItems(listId, updatedItemsWithNewOrder);
          showSuccess('Ordem atualizada com sucesso!');
          await loadList();
        } catch (error) {
          console.error('Erro ao reordenar itens:', error);
          showError('Erro ao reordenar itens.');
          loadList();
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

  const renderItemRow = (item: CustomListItem, index: number) => {
    const isSeparator = item.type === 'separator';
    const isSubtitle = item.type === 'subtitle';
    const isMangueira = item.type === 'mangueira';
    const isItem = item.type === 'item';

    if (isSeparator) {
      return (
        <TableRow key={item.id} id={item.id} className="bg-muted/50 border-y border-dashed">
          <TableCell colSpan={6} className="text-center font-mono text-sm font-bold text-foreground italic p-2">
            <Separator className="my-0 bg-foreground/50 h-px" />
          </TableCell>
        </TableRow>
      );
    }

    if (isSubtitle) {
      const startIndex = items.findIndex(i => i.id === item.id);
      let endIndex = items.findIndex((i, idx) => idx > startIndex && i.type === 'subtitle');
      if (endIndex === -1) endIndex = items.length;

      const groupSelectableItems = items.slice(startIndex, endIndex).filter(i => i.type === 'item' || i.type === 'mangueira');
      const selectedInGroupCount = groupSelectableItems.filter(i => selectedItemIds.has(i.id)).length;

      const isGroupAllSelected = groupSelectableItems.length > 0 && selectedInGroupCount === groupSelectableItems.length;
      const isGroupIndeterminate = selectedInGroupCount > 0 && !isGroupAllSelected;

      return (
        <TableRow 
          key={item.id} 
          id={item.id} 
          className="bg-accent/10 hover:bg-accent/50 border-y-2 border-primary/50"
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item)}
          onDragLeave={handleDragLeave}
          onDragEnd={handleDragEnd}
          data-id={item.id}
        >
          <TableCell className="w-[40px] p-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              {groupSelectableItems.length > 0 && (
                <Checkbox
                  checked={isGroupAllSelected ? true : isGroupIndeterminate ? 'indeterminate' : false}
                  onCheckedChange={(checked) => handleSubtitleSelect(item, checked === true)}
                  aria-label={`Selecionar todos os itens em ${item.item_name}`}
                />
              )}
            </div>
          </TableCell>
          <TableCell colSpan={4} className="text-left font-bold text-lg text-primary p-2">
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

    if (isMangueira) {
      const data = item.mangueira_data;
      if (!data) return null;

      return (
        <TableRow 
          key={item.id} 
          id={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item)}
          onDragLeave={handleDragLeave}
          onDragEnd={handleDragEnd}
          data-id={item.id}
        >
          <TableCell className="w-[40px] p-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <Checkbox
                checked={selectedItemIds.has(item.id)}
                onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
                aria-label={`Selecionar item ${item.item_name}`}
              />
            </div>
          </TableCell>
          <TableCell className="font-medium p-2 text-center">1</TableCell>
          <TableCell className="w-auto p-2">
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm text-primary">{data.mangueira.name || data.mangueira.codigo}</span>
              {data.mangueira.description && (
                <span className="text-xs text-muted-foreground italic">{data.mangueira.description}</span>
              )}
              <span className="text-xs text-muted-foreground mt-1">Cód: {data.mangueira.codigo}</span>
            </div>
          </TableCell>
          <TableCell className="w-[6rem] p-2 text-center font-medium text-lg">
            {data.corte_cm}
          </TableCell>
          <TableCell className="w-auto p-2">
            <div className="flex flex-col items-start space-y-2">
              <div>
                <span className="font-medium text-sm">C1: {data.conexao1.name || data.conexao1.codigo}</span>
                <span className="text-xs text-muted-foreground italic block">Cód: {data.conexao1.codigo}</span>
              </div>
              <div>
                <span className="font-medium text-sm">C2: {data.conexao2.name || data.conexao2.codigo}</span>
                <span className="text-xs text-muted-foreground italic block">Cód: {data.conexao2.codigo}</span>
              </div>
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
    }

    // Item de peça normal
    return (
      <TableRow 
        key={item.id}
        id={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, item)}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        data-id={item.id}
        className="relative"
      >
        <TableCell className="w-[40px] p-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
            <Checkbox
              checked={selectedItemIds.has(item.id)}
              onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
              aria-label={`Selecionar item ${item.item_name}`}
            />
          </div>
        </TableCell>
        <TableCell className="font-medium p-2 text-center">{item.quantity}</TableCell>
        <TableCell className="w-auto p-2" colSpan={2}>
          <div className="flex flex-col items-start">
            {item.part_code && (
              <span className="font-medium text-sm text-primary">{item.part_code}</span>
            )}
            <span className={cn("text-sm", !item.part_code && 'font-medium')}>{item.item_name}</span>
            {item.description && (
              <span className="text-xs text-muted-foreground italic">{item.description}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="w-auto p-2">
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
                  <Tag className="h-3 w-3" /> {item.itens_relacionados.length} item(s)
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
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-2 mb-4 mt-8">
        <Link to="/custom-menu-view">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Catálogo
          </Button>
        </Link>
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
                className="flex-1 sm:w-auto"
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
                        checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Selecionar todos os itens"
                      />
                    </TableHead>
                    <TableHead className="w-[4rem] p-2 text-center">Qtd</TableHead>
                    <TableHead className="w-auto p-2">Item / Mangueira</TableHead>
                    <TableHead className="w-[6rem] p-2 text-center">Corte (cm)</TableHead>
                    <TableHead className="w-auto p-2">Conexões / Detalhes</TableHead>
                    <TableHead className="w-[70px] p-2 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => renderItemRow(item, index))}
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
            <CustomListItemForm
              list={{ id: listId, title: listTitle, user_id: '' }}
              onClose={handleItemSavedOrClosed}
              editingItem={itemToEdit}
              onItemSaved={handleItemSavedOrClosed}
              allAvailableParts={allAvailableParts}
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
  );
};

export default CustomListPage;