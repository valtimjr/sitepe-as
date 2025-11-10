"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal, ArrowUp, ArrowDown, GripVertical, Tag, Info, Loader2, FileDown, Check } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part, RelatedPart, MangueiraItemData } from '@/types/supabase';
import { getCustomListItems, deleteCustomListItem, updateAllCustomListItems } from '@/services/customListService';
import { getParts, getAfsFromService, addSimplePartItem, Af } from '@/services/partListService';
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { lazyGenerateCustomListPdf } from '@/utils/pdfExportUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Separator } from '@/components/ui/separator';
import RelatedPartDisplay from './RelatedPartDisplay';
import CustomListItemForm from './CustomListItemForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import AfSearchInput from './AfSearchInput';
import { MadeWithDyad } from './made-with-dyad'; // Adicionado MadeWithDyad

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
  allAvailableParts: Part[];
}

const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose, allAvailableParts }) => {
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CustomListItem | null>(null);

  const [draggedItem, setDraggedItem] = useState<CustomListItem | null>(null);
  const [openRelatedItemsPopoverId, setOpenRelatedItemsPopoverId] = useState<string | null>(null);

  // Estados para seleção e exportação (duplicados da CustomListPage, mas necessários aqui para o renderItemRow)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [afForExport, setAfForExport] = useState('');
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);

  const isMobile = useIsMobile();

  const loadAfs = useCallback(async () => {
    setIsLoadingAfs(true);
    try {
      const afs = await getAfsFromService();
      setAllAvailableAfs(afs);
    } catch (error) {
      console.error('Erro ao carregar AFs:', error);
    } finally {
      setIsLoadingAfs(false);
    }
  }, []);

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
    loadAfs();
  }, [loadItems, loadAfs]);

  const handleItemSavedOrClosed = () => {
    setIsFormSheetOpen(false);
    setItemToEdit(null);
    loadItems();
  };

  const handleAdd = () => {
    setItemToEdit(null);
    setIsFormSheetOpen(true);
  };

  const handleEditItemClick = (item: CustomListItem) => {
    setItemToEdit(item);
    setIsFormSheetOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteCustomListItem(list.id, itemId);
      showSuccess('Item excluído com sucesso!');
      loadItems();
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
  
    const [removed] = siblings.splice(currentIndex, 1);
    siblings.splice(targetIndex, 0, removed);
  
    const updatedItemsWithNewOrder = siblings.map((reorderedItem, index) => ({
      ...reorderedItem,
      order_index: index,
    }));
    
    setItems(updatedItemsWithNewOrder);

    const loadingToastId = showLoading('Reordenando itens...');

    try {
      await updateAllCustomListItems(list.id, updatedItemsWithNewOrder);
      showSuccess('Ordem atualizada!');
      await loadItems();
    } catch (error) {
      console.error('Erro ao reordenar itens:', error);
      showError('Erro ao reordenar itens.');
      loadItems();
    } finally {
      dismissToast(loadingToastId);
    }
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
        } catch (error) {
          console.error('Erro ao reordenar itens:', error);
          showError('Erro ao reordenar itens.');
          loadItems();
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
      showError('Nenhum item para exportar.');
      return;
    }
    exportDataAsCsv(items, `${list.title.replace(/\s/g, '_')}_itens.csv`);
    showSuccess('Lista exportada para CSV com sucesso!');
  };

  const handleExportPdf = () => {
    if (items.length === 0) {
      showError('Nenhum item para exportar.');
      return;
    }
    lazyGenerateCustomListPdf(items, list.title);
    showSuccess('PDF gerado com sucesso!');
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
  const handleExportSelectedToMyList = async () => {
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

  const renderItemRow = (item: CustomListItem, index: number) => {
    const isSeparator = item.type === 'separator';
    const isSubtitle = item.type === 'subtitle';
    const isMangueira = item.type === 'mangueira';
    const isItem = item.type === 'item';
    
    // Check if the previous item was also a mangueira to decide on the header
    const previousItem = index > 0 ? items[index - 1] : null;
    const showMangueiraHeader = isMangueira && (!previousItem || previousItem.type !== 'mangueira');

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
          <TableCell className="w-[30px] p-2 cursor-grab"><GripVertical className="h-4 w-4" /></TableCell>
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
        <React.Fragment key={item.id}>
          {showMangueiraHeader && (
            <TableRow className="bg-muted/50 border-y border-primary/50">
              <TableHead className="w-[30px] p-2"></TableHead>
              <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Mangueira</TableHead>
              <TableHead className="w-[4rem] p-2 text-center font-bold text-sm">Corte (cm)</TableHead>
              <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Conexão 1</TableHead>
              <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Conexão 2</TableHead>
              <TableHead className="w-[70px] p-2 text-right"></TableHead>
            </TableRow>
          )}
          <TableRow 
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, item)}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            data-id={item.id}
          >
            <TableCell className="w-[30px] p-2 cursor-grab">
              <GripVertical className="h-4 w-4" />
            </TableCell>
            
            {/* Coluna 1: Mangueira (Nome/Desc/Cód) */}
            <TableCell className="w-auto whitespace-normal break-words p-2 text-left">
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm text-primary whitespace-normal break-words">{data.mangueira.name || data.mangueira.codigo}</span>
                {data.mangueira.description && (
                  <span className="text-xs text-muted-foreground italic max-w-full whitespace-normal break-words">{data.mangueira.description}</span>
                )}
                <span className="text-xs text-muted-foreground mt-1">Cód: {data.mangueira.codigo}</span>
              </div>
            </TableCell>
            
            {/* Coluna 2: Corte (cm) */}
            <TableCell className="w-[4rem] p-2 text-center font-medium text-lg">
              {data.corte_cm}
            </TableCell>
            
            {/* Coluna 3: Conexão 1 */}
            <TableCell className="w-auto whitespace-normal break-words p-2 text-left">
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm whitespace-normal break-words">{data.conexao1.name || data.conexao1.codigo}</span>
                {data.conexao1.description && (
                  <span className="text-xs text-muted-foreground italic max-w-full whitespace-normal break-words">{data.conexao1.description}</span>
                )}
                <span className="text-xs text-muted-foreground mt-1">Cód: {data.conexao1.codigo}</span>
              </div>
            </TableCell>
            
            {/* Coluna 4: Conexão 2 */}
            <TableCell className="w-auto whitespace-normal break-words p-2 text-left">
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm whitespace-normal break-words">{data.conexao2.name || data.conexao2.codigo}</span>
                {data.conexao2.description && (
                  <span className="text-xs text-muted-foreground italic max-w-full whitespace-normal break-words">{data.conexao2.description}</span>
                )}
                <span className="text-xs text-muted-foreground mt-1">Cód: {data.conexao2.codigo}</span>
              </div>
            </TableCell>

            {/* Coluna 5: Ações */}
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
        </React.Fragment>
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
        <TableCell className="w-auto whitespace-normal break-words p-2 text-left" colSpan={isMobile ? 4 : 3}>
            <div className="flex flex-col items-start">
              {item.part_code && (
                <span className="font-medium text-sm text-primary whitespace-normal break-words">
                  Cód.: {item.part_code}
                </span>
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
  };

  const SimpleItemHeader = () => (
    <TableRow className="bg-muted/50 border-y border-primary/50">
      <TableHead className="w-[40px] p-2">
        <Checkbox
          checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
          onCheckedChange={handleToggleSelectAll}
          aria-label="Selecionar todos os itens"
        />
      </TableHead>
      <TableHead className="w-[4rem] p-2 text-center font-bold text-sm">Qtd</TableHead>
      <TableHead className="w-auto p-2 text-left font-bold text-sm" colSpan={isMobile ? 4 : 3}>Item / Código / Descrição</TableHead>
    </TableRow>
  );

  const MangueiraHeader = () => (
    <TableRow className="bg-muted/50 border-y border-primary/50">
      <TableHead className="w-[40px] p-2">
        <Checkbox
          checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
          onCheckedChange={handleToggleSelectAll}
          aria-label="Selecionar todos os itens"
        />
      </TableHead>
      <TableHead className="w-[4rem] p-2 text-center font-bold text-sm">Qtd</TableHead>
      <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Mangueira</TableHead>
      <TableHead className="w-[6rem] p-2 text-center font-bold text-sm">Corte (cm)</TableHead>
      {isMobile ? (
        <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm" colSpan={2}>Conexões</TableHead>
      ) : (
        <>
          <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Conexão 1</TableHead>
          <TableHead className="w-auto whitespace-normal break-words p-2 text-left font-bold text-sm">Conexão 2</TableHead>
        </>
      )}
    </TableRow>
  );

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
              <TableBody>
                {(() => {
                  let lastItemType: string | null = null;
                  const rows: React.ReactNode[] = [];

                  items.forEach((item, index) => {
                    const currentItemType = item.type;

                    if (currentItemType === 'subtitle' || currentItemType === 'separator') {
                      rows.push(renderItemRow(item, index));
                      lastItemType = null;
                      return;
                    }

                    if (currentItemType !== lastItemType) {
                      if (currentItemType === 'item') {
                        rows.push(<SimpleItemHeader key={`header-item-${index}`} />);
                      }
                      lastItemType = currentItemType;
                    }

                    rows.push(renderItemRow(item, index));
                  });

                  return rows;
                })()}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Sheet para Adicionar/Editar Item */}
      <Sheet open={isFormSheetOpen} onOpenChange={setIsFormSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{itemToEdit ? 'Editar Item' : 'Adicionar Novo Item'}</SheetTitle>
            <SheetDescription>
              {itemToEdit ? 'Edite os detalhes do item da lista.' : 'Adicione um novo item, subtítulo ou separador.'}
            </SheetDescription>
          </SheetHeader>
          <CustomListItemForm
            list={list}
            editingItem={itemToEdit}
            onItemSaved={handleItemSavedOrClosed}
            onClose={handleItemSavedOrClosed}
            allAvailableParts={allAvailableParts}
          />
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
              <AfSearchInput
                value={afForExport}
                onChange={setAfForExport}
                availableAfs={allAvailableAfs}
                onSelectAf={setAfForExport}
              />
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
    </Card>
  );
};

export default CustomListEditor;