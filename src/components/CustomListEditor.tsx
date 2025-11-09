"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal, ArrowUp, ArrowDown, GripVertical, Tag, Info, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part, RelatedPart, MangueiraItemData } from '@/types/supabase';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import RelatedPartDisplay from './RelatedPartDisplay';
import CustomListItemForm from './CustomListItemForm'; // Importar o novo componente

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
        <TableCell colSpan={3} className="w-auto whitespace-normal break-words p-2 text-left">
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
                  <TableHead className="w-[30px] p-2">
                    <GripVertical className="h-4 w-4" />
                  </TableHead>
                  <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                  <TableHead colSpan={3} className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead>
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
    </Card>
  );
};

export default CustomListEditor;