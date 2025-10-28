import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePartItem, clearSimplePartsList, deleteSimplePartItem, updateSimplePartItem, getParts, getAfsFromService, Part, Af } from '@/services/partListService';
import { generatePartsListPdf } from '@/lib/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, Download, Copy, GripVertical, MoreHorizontal, Edit, Save, XCircle, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PartSearchInput from './PartSearchInput'; // Reusing existing component
import AfSearchInput from './AfSearchInput'; // Reusing existing component

interface PartsListDisplayProps {
  listItems: SimplePartItem[];
  onListChanged: () => void;
  onListReordered: (reorderedItems: SimplePartItem[]) => void;
  listTitle: string;
  onTitleChange: (title: string) => void;
}

const PartsListDisplay: React.FC<PartsListDisplayProps> = ({ listItems, onListChanged, onListReordered, listTitle, onTitleChange }) => {
  const [orderedItems, setOrderedItems] = useState<SimplePartItem[]>(listItems);
  const [draggedItem, setDraggedItem] = useState<SimplePartItem | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form states for the currently edited item
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formAf, setFormAf] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedPartForEdit, setSelectedPartForEdit] = useState<Part | null>(null); // For inline part search
  const [searchQueryForEdit, setSearchQueryForEdit] = useState(''); // For inline part search

  // Global parts and AFs for search inputs
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  const [searchResultsForEdit, setSearchResultsForEdit] = useState<Part[]>([]); // For inline part search

  // Sincroniza o estado interno com a prop listItems quando ela muda
  useEffect(() => {
    setOrderedItems(listItems);
  }, [listItems]);

  // Load all parts and AFs for search inputs
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingParts(true);
      const parts = await getParts();
      setAllAvailableParts(parts);
      setIsLoadingParts(false);

      setIsLoadingAfs(true);
      const afs = await getAfsFromService();
      setAllAvailableAfs(afs);
      setIsLoadingAfs(false);
    };
    loadInitialData();
  }, []);

  // Effect for inline part search
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQueryForEdit.length > 1) {
        // setIsLoadingParts(true); // This might interfere with global loading state
        const results = await getParts(searchQueryForEdit); // Assuming getParts can take a search query
        setSearchResultsForEdit(results);
        // setIsLoadingParts(false);
      } else {
        setSearchResultsForEdit([]);
      }
    };
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQueryForEdit]);


  const handleExportPdf = () => {
    if (orderedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    generatePartsListPdf(orderedItems, listTitle);
    showSuccess('PDF gerado com sucesso!');
  };

  const formatListText = () => {
    if (orderedItems.length === 0) return '';

    let formattedText = `${listTitle}\n\n`;

    orderedItems.forEach(item => {
      const quantidade = item.quantidade ?? 1;
      const codigo = item.codigo_peca || '';
      const descricao = item.descricao || '';
      const af = item.af ? ` (AF: ${item.af})` : '';
      
      formattedText += `${quantidade} - ${codigo} ${descricao}${af}`.trim() + '\n';
    });

    return formattedText.trim();
  };

  const handleCopyList = async () => {
    if (orderedItems.length === 0) {
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

  const handleShareOnWhatsApp = () => {
    if (orderedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de compartilhar.');
      return;
    }

    const textToShare = formatListText();
    const encodedText = encodeURIComponent(textToShare);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
    showSuccess('Lista de peças pronta para compartilhar no WhatsApp!');
  };

  const handleClearList = async () => {
    try {
      await clearSimplePartsList();
      onListChanged();
      showSuccess('Lista de peças simples limpa com sucesso!');
    } catch (error) {
      showError('Erro ao limpar a lista de peças simples.');
      console.error('Failed to clear simple parts list:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteSimplePartItem(id);
      onListChanged();
      showSuccess('Item removido da lista.');
    } catch (error) {
      showError('Erro ao remover item da lista.');
      console.error('Failed to delete item:', error);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, item: SimplePartItem) => {
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

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetItem: SimplePartItem) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-t-2', 'border-primary');

    if (draggedItem && draggedItem.id !== targetItem.id) {
      const newOrderedItems = [...orderedItems];
      const draggedIndex = newOrderedItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newOrderedItems.findIndex(item => item.id === targetItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newOrderedItems.splice(draggedIndex, 1);
        newOrderedItems.splice(targetIndex, 0, removed);
        
        setOrderedItems(newOrderedItems);
        onListReordered(newOrderedItems);
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedItem(null);
  };
  // --- End Drag and Drop Handlers ---

  // --- Inline Edit Handlers ---
  const handleEditClick = (item: SimplePartItem) => {
    setEditingItemId(item.id);
    setFormQuantity(item.quantidade ?? 1);
    setFormAf(item.af || '');
    setFormPartCode(item.codigo_peca || '');
    setFormDescription(item.descricao || '');
    setSelectedPartForEdit(null); // Reset selected part for search
    setSearchQueryForEdit(''); // Clear search query
  };

  const handleSaveEdit = async (originalItem: SimplePartItem) => {
    if (!formPartCode.trim() && !formDescription.trim()) {
      showError('O Código da Peça ou a Descrição são obrigatórios.');
      return;
    }
    if (formQuantity <= 0) {
      showError('A quantidade deve ser maior que zero.');
      return;
    }

    const updatedItem: SimplePartItem = {
      ...originalItem,
      quantidade: formQuantity,
      af: formAf.trim() || undefined,
      codigo_peca: formPartCode.trim(),
      descricao: formDescription.trim(),
    };

    try {
      await updateSimplePartItem(updatedItem);
      showSuccess('Item atualizado com sucesso!');
      setEditingItemId(null);
      onListChanged(); // Reload list to reflect changes
    } catch (error) {
      showError('Erro ao salvar edição do item.');
      console.error('Failed to save edited item:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    // Reset form states (optional, as they will be re-initialized on next edit)
  };

  const handleSelectPartForEdit = (part: Part | null) => {
    setSelectedPartForEdit(part);
    if (part) {
      setFormPartCode(part.codigo);
      setFormDescription(part.descricao);
    } else {
      // If part is null, clear description but keep part code as typed
      setFormDescription('');
    }
  };

  const handlePartCodeChangeForEdit = (value: string) => {
    setFormPartCode(value);
    setSearchQueryForEdit(value); // Trigger search
    setSelectedPartForEdit(null); // Clear selected part if user types
  };

  const handleAfSelectForEdit = (afNumber: string) => {
    setFormAf(afNumber);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Lista de Peças</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mb-4">
          <Label htmlFor="list-title">Título da Lista (para PDF/Cópia)</Label>
          <Input
            id="list-title"
            type="text"
            value={listTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ex: Peças para Manutenção de Frota X"
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
            <Button 
              onClick={handleCopyList} 
              disabled={orderedItems.length === 0} 
              size="icon"
              className="sm:w-auto sm:px-4"
            >
              <Copy className="h-4 w-4" /> 
              <span className="hidden sm:inline ml-2">Copiar Lista</span>
            </Button>
            <Button 
              onClick={handleShareOnWhatsApp} 
              disabled={orderedItems.length === 0} 
              variant="ghost" 
              className="h-10 w-10 p-0 rounded-full" 
              aria-label="Compartilhar no WhatsApp" 
            >
              <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-10 w-10" />
            </Button>
            <Button onClick={handleExportPdf} disabled={orderedItems.length === 0} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={orderedItems.length === 0} 
                  size="icon"
                  className="sm:w-auto sm:px-4"
                >
                  <Trash2 className="h-4 w-4" /> 
                  <span className="hidden sm:inline ml-2">Limpar Lista</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover todos os itens da sua lista de peças simples. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearList}>Limpar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
      <CardContent>
        {orderedItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item na lista. Adicione peças para começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] p-2"></TableHead> {/* Coluna para o handle de drag */}
                  <TableHead className="w-auto whitespace-normal break-words p-2">Peça (Cód. / Descrição / AF)</TableHead>
                  <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                  <TableHead className="w-[40px] p-2 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    draggable={editingItemId !== item.id} // Only draggable if not in edit mode
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    data-id={item.id}
                    className="relative"
                  >
                    <TableCell className="w-[40px] p-2 cursor-grab">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    
                    {editingItemId === item.id ? (
                      <>
                        <TableCell className="w-auto whitespace-normal break-words p-2 space-y-1">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`edit-part-code-${item.id}`} className="sr-only">Código da Peça</Label>
                            <PartSearchInput
                              onSearch={setSearchQueryForEdit}
                              searchResults={searchResultsForEdit}
                              onSelectPart={handleSelectPartForEdit}
                              searchQuery={searchQueryForEdit}
                              allParts={allAvailableParts}
                              isLoading={isLoadingParts}
                            />
                            <Label htmlFor={`edit-description-${item.id}`} className="sr-only">Descrição</Label>
                            <Input
                              id={`edit-description-${item.id}`}
                              type="text"
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              placeholder="Descrição da peça"
                              className="text-xs"
                            />
                            <Label htmlFor={`edit-af-${item.id}`} className="sr-only">AF</Label>
                            <AfSearchInput
                              value={formAf}
                              onChange={setFormAf}
                              availableAfs={allAvailableAfs}
                              onSelectAf={handleAfSelectForEdit}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="w-[4rem] p-2 text-center">
                          <Label htmlFor={`edit-quantity-${item.id}`} className="sr-only">Quantidade</Label>
                          <Input
                            id={`edit-quantity-${item.id}`}
                            type="number"
                            value={formQuantity}
                            onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full text-center"
                          />
                        </TableCell>
                        <TableCell className="w-[40px] p-2 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(item)}>
                                  <Save className="h-4 w-4 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Salvar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="w-auto whitespace-normal break-words p-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{item.codigo_peca || 'N/A'}</span>
                            <span className="text-xs text-muted-foreground">{item.descricao || 'N/A'}</span>
                            {item.af && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 mt-1">AF: {item.af}</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="w-[4rem] p-2 text-center font-medium">{item.quantidade ?? 'N/A'}</TableCell>
                        
                        <TableCell className="w-[40px] p-2 text-right">
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                  <Edit className="h-4 w-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" /> Remover
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação irá remover o item "{item.codigo_peca || item.descricao}" da lista. Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Remover</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PartsListDisplay;