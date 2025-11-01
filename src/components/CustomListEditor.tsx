import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { CustomList, CustomListItem, Part } from '@/types/supabase';
import { getCustomListItems, addCustomListItem, updateCustomListItem, deleteCustomListItem } from '@/services/customListService';
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
import { getParts, searchParts as searchPartsService } from '@/services/partListService'; // Importação corrigida
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { generateCustomListPdf } from '@/lib/pdfGenerator'; // Importar nova função
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
}

const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose }) => {
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<CustomListItem | null>(null);
  
  // Form states
  const [formItemName, setFormItemName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);

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

  const resetForm = () => {
    setCurrentEditItem(null);
    setFormItemName('');
    setFormPartCode('');
    setFormDescription('');
    setFormQuantity(1);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: CustomListItem) => {
    setCurrentEditItem(item);
    setFormItemName(item.item_name);
    setFormPartCode(item.part_code || '');
    setFormDescription(item.description || '');
    setFormQuantity(item.quantity);
    setSearchQuery('');
    setSearchResults([]);
    setIsDialogOpen(true);
  };

  const handleSelectPart = (part: Part) => {
    setFormPartCode(part.codigo);
    setFormDescription(part.descricao);
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

    // Validação: Pelo menos o nome personalizado OU a descrição deve estar preenchido
    if (!trimmedItemName && !trimmedDescription) {
      showError('O Nome ou a Descrição da Peça deve ser preenchido.');
      return;
    }

    // Determina o nome final do item: usa o nome personalizado, ou a descrição como fallback
    const finalItemName = trimmedItemName || trimmedDescription;

    const payload: Omit<CustomListItem, 'id' | 'created_at' | 'order_index'> = {
      list_id: list.id,
      item_name: finalItemName,
      part_code: trimmedPartCode || null,
      description: trimmedDescription || null,
      quantity: formQuantity,
    };

    try {
      if (currentEditItem) {
        await updateCustomListItem({ ...currentEditItem, ...payload });
        showSuccess('Item atualizado com sucesso!');
      } else {
        await addCustomListItem(payload);
        showSuccess('Item adicionado com sucesso!');
      }
      
      setIsDialogOpen(false);
      loadItems();
    } catch (error) {
      showError('Erro ao salvar item.');
      console.error('Failed to save item:', error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteCustomListItem(itemId);
      showSuccess('Item excluído com sucesso!');
      loadItems();
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
      // Troca os índices de ordem
      await Promise.all([
        updateCustomListItem({ ...currentItem, order_index: targetItem.order_index }),
        updateCustomListItem({ ...targetItem, order_index: currentItem.order_index }),
      ]);

      showSuccess('Ordem atualizada!');
      await loadItems(); // Recarrega para refletir a nova ordem
    } catch (error) {
      showError('Erro ao reordenar itens.');
      console.error('Failed to reorder list items:', error);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const formatListText = () => {
    if (items.length === 0) return '';

    let formattedText = `${list.title}\n\n`;

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
    e.dataTransfer.setData('text/plain', item.id); // Usar o ID para identificar o item
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-t-2', 'border-primary'); // Feedback visual
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-primary');
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, targetItem: CustomListItem) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-t-2', 'border-primary');

    if (draggedItem && draggedItem.id !== targetItem.id) {
      const newOrderedItems = [...items];
      const draggedIndex = newOrderedItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newOrderedItems.findIndex(item => item.id === targetItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newOrderedItems.splice(draggedIndex, 1);
        newOrderedItems.splice(targetIndex, 0, removed);
        
        // Atualiza o estado local imediatamente para feedback visual
        setItems(newOrderedItems);

        const loadingToastId = showLoading('Reordenando itens...');
        try {
          // Persiste a nova ordem no banco de dados
          const updatePromises = newOrderedItems.map((item, index) => 
            updateCustomListItem({ ...item, order_index: index })
          );
          await Promise.all(updatePromises);
          showSuccess('Ordem atualizada com sucesso!');
          await loadItems(); // Recarrega para garantir a consistência
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
                    <GripVertical className="h-4 w-4 text-muted-foreground" /> {/* Ícone para drag handle */}
                  </TableHead>
                  <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                  <TableHead className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead>
                  <TableHead className="w-[120px] p-2 text-right">Ações</TableHead> {/* Aumentado para acomodar 4 botões */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow 
                    key={item.id}
                    draggable // Habilita o arrastar
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
                      </div>
                    </TableCell>
                    <TableCell className="w-[120px] p-2 text-right"> {/* Largura ajustada */}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentEditItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nome (Opcional)</Label>
              <Input
                id="item-name"
                value={formItemName}
                onChange={(e) => setFormItemName(e.target.value)}
                placeholder="Ex: Kit de Reparo do Motor"
              />
            </div>
            
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

            <div className="space-y-2">
              <Label htmlFor="part-code">Código da Peça (Opcional)</Label>
              <Input
                id="part-code"
                value={formPartCode}
                onChange={(e) => setFormPartCode(e.target.value)}
                placeholder="Código da peça"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição da peça"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                value={formQuantity}
                onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                min="1"
                required
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

export default CustomListEditor;