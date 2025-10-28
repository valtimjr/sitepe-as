/** @jsxImportSource react */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePartItem, clearSimplePartsList, deleteSimplePartItem, updateSimplePartItem, getParts, getAfsFromService, Part, Af, addSimplePartItem } from '@/services/partListService';
import { generatePartsListPdf } from '@/lib/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, Download, Copy, GripVertical, MoreHorizontal, Edit, Save, XCircle, Loader2, PlusCircle } from 'lucide-react';
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
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';

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
  const [isAddingInline, setIsAddingInline] = useState(false);

  // Form states for the currently edited item
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formAf, setFormAf] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedPartForEdit, setSelectedPartForEdit] = useState<Part | null>(null);
  const [searchQueryForEdit, setSearchQueryForEdit] = useState('');
  const [searchResultsForEdit, setSearchResultsForEdit] = useState<Part[]>([]);

  // Form states for inline add item
  const [inlineFormQuantity, setInlineFormQuantity] = useState<number>(1);
  const [inlineFormAf, setInlineFormAf] = useState('');
  const [inlineFormPartCode, setInlineFormPartCode] = useState('');
  const [inlineFormDescription, setInlineFormDescription] = useState('');
  const [inlineSelectedPart, setInlineSelectedPart] = useState<Part | null>(null);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');
  const [inlineSearchResults, setInlineSearchResults] = useState<Part[]>([]);

  // Global parts and AFs for search inputs
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  
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

  // Effect for inline part search (edit mode)
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQueryForEdit.length > 1) {
        const results = await getParts(searchQueryForEdit);
        setSearchResultsForEdit(results);
      } else {
        setSearchResultsForEdit([]);
      }
    };
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQueryForEdit]);

  // Effect for inline part search (add mode)
  useEffect(() => {
    const fetchInlineSearchResults = async () => {
      if (inlineSearchQuery.length > 1) {
        const results = await getParts(inlineSearchQuery);
        setInlineSearchResults(results);
      } else {
        setInlineSearchResults([]);
      }
    };
    const handler = setTimeout(() => {
      fetchInlineSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [inlineSearchQuery]);


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
    } catch (error: any) { // Corrigido o erro de sintaxe aqui
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
    setSelectedPartForEdit(null);
    setSearchQueryForEdit('');
    setIsAddingInline(false); // Fecha o inline add se estiver aberto
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
      onListChanged();
    } catch (error) {
      showError('Erro ao salvar edição do item.');
      console.error('Failed to save edited item:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSelectPartForEdit = (part: Part | null) => {
    setSelectedPartForEdit(part);
    if (part) {
      setFormPartCode(part.codigo);
      setFormDescription(part.descricao);
    } else {
      setFormDescription('');
    }
  };

  const handlePartCodeChangeForEdit = (value: string) => {
    setFormPartCode(value);
    setSearchQueryForEdit(value);
    setSelectedPartForEdit(null);
  };

  const handleAfSelectForEdit = (afNumber: string) => {
    setFormAf(afNumber);
  };
  // --- End Inline Edit Handlers ---

  // --- Inline Add Handlers ---
  const handleToggleInlineAdd = () => {
    setIsAddingInline(prev => !prev);
    if (!isAddingInline) { // Se está abrindo o formulário
      setInlineFormQuantity(1);
      setInlineFormAf('');
      setInlineFormPartCode('');
      setInlineFormDescription('');
      setInlineSelectedPart(null);
      setInlineSearchQuery('');
      setEditingItemId(null); // Fecha o inline edit se estiver aberto
    }
  };

  const handleSaveInlineAdd = async () => {
    if (!inlineFormPartCode.trim() && !inlineFormDescription.trim()) {
      showError('O Código da Peça ou a Descrição são obrigatórios.');
      return;
    }
    if (inlineFormQuantity <= 0) {
      showError('A quantidade deve ser maior que zero.');
      return;
    }

    const newItem: Omit<SimplePartItem, 'id'> = {
      quantidade: inlineFormQuantity,
      af: inlineFormAf.trim() || undefined,
      codigo_peca: inlineFormPartCode.trim(),
      descricao: inlineFormDescription.trim(),
    };

    try {
      await addSimplePartItem(newItem);
      showSuccess('Novo item adicionado com sucesso!');
      setIsAddingInline(false);
      onListChanged();
    } catch (error) {
      showError('Erro ao adicionar novo item.');
      console.error('Failed to add new item inline:', error);
    }
  };

  const handleCancelInlineAdd = () => {
    setIsAddingInline(false);
  };

  const handleSelectPartForInlineAdd = (part: Part | null) => {
    setInlineSelectedPart(part);
    if (part) {
      setInlineFormPartCode(part.codigo);
      setInlineFormDescription(part.descricao);
    } else {
      setInlineFormDescription('');
    }
  };

  const handlePartCodeChangeForInlineAdd = (value: string) => {
    setInlineFormPartCode(value);
    setInlineSearchQuery(value);
    setInlineSelectedPart(null);
  };

  const handleAfSelectForInlineAdd = (afNumber: string) => {
    setInlineFormAf(afNumber);
  };
  // --- End Inline Add Handlers ---

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Lista de Peças</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mb-4">
          <Label htmlFor="list-title">Título da Lista</Label>
          <Input
            id="list-title"
            type="text"
            value={listTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Lista de Peças"
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
        {orderedItems.length === 0 && !isAddingInline ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item na lista. Adicione peças para começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] p-2"></TableHead> {/* Coluna para o handle de drag */}
                  <TableHead className="w-auto whitespace-normal break-words p-2">Peça / Descrição</TableHead>
                  <TableHead className="w-[8rem] p-2">AF / Qtd</TableHead>
                  <TableHead className="w-[80px] p-2 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    draggable={editingItemId !== item.id && !isAddingInline} // Only draggable if not in edit/add mode
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
                        {/* Coluna Peça / Descrição (Modo Edição) */}
                        <TableCell className="w-auto whitespace-normal break-words p-2 space-y-1">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`edit-part-code-${item.id}`} className="sr-only">Código da Peça</Label>
                            <PartSearchInput
                              onSearch={handlePartCodeChangeForEdit}
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
                          </div>
                        </TableCell>
                        {/* Coluna AF / Qtd (Modo Edição) */}
                        <TableCell className="w-[8rem] p-2 space-y-1">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`edit-af-${item.id}`} className="sr-only">AF</Label>
                            <AfSearchInput
                              value={formAf}
                              onChange={setFormAf}
                              availableAfs={allAvailableAfs}
                              onSelectAf={handleAfSelectForEdit}
                            />
                            <Label htmlFor={`edit-quantity-${item.id}`} className="sr-only">Quantidade</Label>
                            <Input
                              id={`edit-quantity-${item.id}`}
                              type="number"
                              value={formQuantity}
                              onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                              min="1"
                              className="w-full text-center"
                            />
                          </div>
                        </TableCell>
                        {/* Coluna Ações (Modo Edição) */}
                        <TableCell className="w-[80px] p-2 text-right">
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
                        {/* Coluna Peça / Descrição (Modo Visualização) */}
                        <TableCell className="w-auto whitespace-normal break-words p-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{item.codigo_peca || 'N/A'}</span>
                            <span className="text-xs text-muted-foreground">{item.descricao || 'N/A'}</span>
                          </div>
                        </TableCell>
                        {/* Coluna AF / Qtd (Modo Visualização) */}
                        <TableCell className="w-[8rem] p-2 text-center">
                          <div className="flex flex-col items-center justify-center">
                            {item.af && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">AF: {item.af}</span>
                            )}
                            <span className="font-medium">{item.quantidade ?? 'N/A'}</span>
                          </div>
                        </TableCell>
                        {/* Coluna Ações (Modo Visualização) */}
                        <TableCell className="w-[80px] p-2 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar Item</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remover Item</TooltipContent>
                                </Tooltip>
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
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}

                {isAddingInline && (
                  <TableRow className="bg-accent/10">
                    <TableCell className="w-[40px] p-2"></TableCell>
                    {/* Coluna Peça / Descrição (Modo Adicionar Inline) */}
                    <TableCell className="w-auto whitespace-normal break-words p-2 space-y-1">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="inline-part-code" className="sr-only">Código da Peça</Label>
                        <PartSearchInput
                          onSearch={handlePartCodeChangeForInlineAdd}
                          searchResults={inlineSearchResults}
                          onSelectPart={handleSelectPartForInlineAdd}
                          searchQuery={inlineSearchQuery}
                          allParts={allAvailableParts}
                          isLoading={isLoadingParts}
                        />
                        <Label htmlFor="inline-description" className="sr-only">Descrição</Label>
                        <Input
                          id="inline-description"
                          type="text"
                          value={inlineFormDescription}
                          onChange={(e) => setInlineFormDescription(e.target.value)}
                          placeholder="Descrição da peça"
                          className="text-xs"
                        />
                      </div>
                    </TableCell>
                    {/* Coluna AF / Qtd (Modo Adicionar Inline) */}
                    <TableCell className="w-[8rem] p-2 space-y-1">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="inline-af" className="sr-only">AF</Label>
                        <AfSearchInput
                          value={inlineFormAf}
                          onChange={setInlineFormAf}
                          availableAfs={allAvailableAfs}
                          onSelectAf={handleAfSelectForInlineAdd}
                        />
                        <Label htmlFor="inline-quantity" className="sr-only">Quantidade</Label>
                        <Input
                          id="inline-quantity"
                          type="number"
                          value={inlineFormQuantity}
                          onChange={(e) => setInlineFormQuantity(parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full text-center"
                        />
                      </div>
                    </TableCell>
                    {/* Coluna Ações (Modo Adicionar Inline) */}
                    <TableCell className="w-[80px] p-2 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleSaveInlineAdd}>
                              <Save className="h-4 w-4 text-green-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Salvar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleCancelInlineAdd}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 text-center">
          <Button 
            onClick={handleToggleInlineAdd} 
            variant="outline" 
            className="flex items-center gap-2"
            disabled={editingItemId !== null} // Desabilita se estiver editando outro item
          >
            <PlusCircle className="h-4 w-4" /> {isAddingInline ? 'Cancelar Adição' : 'Adicionar Item'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PartsListDisplay;