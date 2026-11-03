"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePartItem, clearSimplePartsList, deleteSimplePartItem, updateSimplePartItem, getAfsFromService, Part, Af, addSimplePartItem, searchParts as searchPartsService } from '@/services/partListService';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, GripVertical, Edit, Save, XCircle, PlusCircle, Tag, ArrowUpDown, Share2 } from 'lucide-react';
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
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { useIsMobile } from '@/hooks/use-mobile'; // Importar o hook useIsMobile
import { cn } from '@/lib/utils'; // Importar cn
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/responsive/ResponsivePopover';
import { ScrollArea } from '@/components/ui/scroll-area';
import RelatedPartDisplay from './RelatedPartDisplay'; // Importado o novo componente
import { nameFor, relatedFor, useRelatedParts } from '@/components/parts-list/useRelatedParts';
import { useListShareSheet } from '@/components/parts-list/useListShareSheet';
import { useFlashNewItems } from '@/components/parts-list/useFlashNewItems';
import PartsListSortSheet, { type SortField as SheetSortField, type SortDirection as SheetSortDirection } from '@/components/parts-list/PartsListSortSheet';
import DragHandle from '@/components/sortable/DragHandle';
import { SortableTableBody, SortableTableRow } from '@/components/sortable/SortableList';
import { useCompany } from '@/context/CompanyContext';
import type { ListIcon } from '@/types/listIcon';

interface PartsListDisplayProps {
  listItems: SimplePartItem[];
  onListChanged: () => void;
  onListReordered: (reorderedItems: SimplePartItem[]) => void;
  listTitle: string;
  onTitleChange: (title: string) => void;
  onOpenEditForm: (item: SimplePartItem) => void; // Nova prop para abrir o formulário de edição
  listIcon?: ListIcon | null;
  /** Lista ativa (destaque das peças novas e nuvem). */
  listId?: string;
}

type SortField = 'codigo' | 'descricao' | 'af' | 'quantidade' | null;
type SortDirection = 'asc' | 'desc';

const PartsListDisplay: React.FC<PartsListDisplayProps> = ({ listItems, onListChanged, onListReordered, listTitle, onTitleChange, onOpenEditForm, listIcon, listId }) => {
  const { company, branding } = useCompany();
  const relatedPartsCache = useRelatedParts(listItems);
  const [orderedItems, setOrderedItems] = useState<SimplePartItem[]>(listItems);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [groupByAf, setGroupByAf] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const flashIds = useFlashNewItems(listItems, listId);

  // Estados de ordenação
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const isMobile = useIsMobile(); // Usar o hook useIsMobile

  // Form states for the currently edited item (used only for desktop inline editing)
  const [formQuantity, setFormQuantity] = useState<number | "">(1);
  const [formQuantityError, setFormQuantityError] = useState(false);
  const [formAf, setFormAf] = useState('');
  const [formPartCode, setFormPartCode] = useState(''); // Código da peça selecionada/confirmada
  const [formDescription, setFormDescription] = useState(''); // Descrição da peça selecionada/confirmada
  const [searchQueryForEdit, setSearchQueryForEdit] = useState(''); // Query para o PartSearchInput
  const [searchResultsForEdit, setSearchResultsForEdit] = useState<Part[]>([]);

  // Form states for inline add item
  const [inlineFormQuantity, setInlineFormQuantity] = useState<number | "">(1);
  const [inlineFormQuantityError, setInlineFormQuantityError] = useState(false);
  const [inlineFormAf, setInlineFormAf] = useState('');
  const [inlineFormPartCode, setInlineFormPartCode] = useState(''); // Código da peça selecionada/confirmada
  const [inlineFormDescription, setInlineFormDescription] = useState(''); // Descrição da peça selecionada/confirmada
  const [inlineSearchQuery, setInlineSearchQuery] = useState(''); // Query para o PartSearchInput
  const [inlineSearchResults, setInlineSearchResults] = useState<Part[]>([]);

  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const isLoadingParts = false;

  // Sincroniza o estado interno com a prop listItems quando ela muda e reaplica a ordenação
  useEffect(() => {
    if (sortField) {
      applySort(listItems, sortField, sortDirection, false);
    } else {
      setOrderedItems(listItems);
    }
  }, [listItems]);

  const applySort = (items: SimplePartItem[], field: SortField, direction: SortDirection, persist = true) => {
    if (!field) {
      setOrderedItems(items);
      return;
    }

    const sorted = [...items].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (field === 'codigo') {
        valA = a.codigo_peca || '';
        valB = b.codigo_peca || '';
      } else if (field === 'descricao') {
        valA = a.descricao || '';
        valB = b.descricao || '';
      } else if (field === 'af') {
        valA = a.af || '';
        valB = b.af || '';
      } else if (field === 'quantidade') {
        valA = a.quantidade ?? 0;
        valB = b.quantidade ?? 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        // Ordenação alfabética sem diferenciar maiúsculas/minúsculas
        return direction === 'asc'
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      } else {
        // Ordenação numérica
        return direction === 'asc' ? valA - valB : valB - valA;
      }
    });

    setOrderedItems(sorted);
    if (persist) onListReordered(sorted);
  };

  const handleSort = (field: SortField) => {
    if (!field) return;

    let newDirection: SortDirection = 'asc';
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }

    setSortField(field);
    setSortDirection(newDirection);
    applySort(listItems, field, newDirection);
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // AFs para os campos de busca (o catálogo de peças não é mais baixado inteiro)
  useEffect(() => {
    getAfsFromService(company).then(setAllAvailableAfs).catch(() => setAllAvailableAfs([]));
  }, [company]);

  // Effect for inline part search (edit mode)
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQueryForEdit.length > 1) {
        const results = await searchPartsService(searchQueryForEdit, company);
        setSearchResultsForEdit(results);
      } else {
        setSearchResultsForEdit([]);
      }
    };
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQueryForEdit, company]);

  // Effect for inline part search (add mode)
  useEffect(() => {
    const fetchInlineSearchResults = async () => {
      if (inlineSearchQuery.length > 1) {
        const results = await searchPartsService(inlineSearchQuery, company);
        setInlineSearchResults(results);
      } else {
        setInlineSearchResults([]);
      }
    };
    const handler = setTimeout(() => {
      fetchInlineSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [inlineSearchQuery, company]);


  const share = useListShareSheet({
    items: orderedItems,
    title: listTitle,
    icon: listIcon,
    listId,
    onClear: () => setClearConfirm(true),
    onReload: onListChanged,
  });

  // Ao trocar de lista, desfaz o agrupamento
  useEffect(() => setGroupByAf(false), [listId]);

  const handleSheetSort = (field: SheetSortField, direction: SheetSortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    applySort(listItems, field, direction);
  };

  const handleClearList = async () => {
    try {
      await clearSimplePartsList(company);
      onListChanged();
      showSuccess('Lista de peças simples limpa com sucesso!');
    } catch (error) {
      showError('Erro ao limpar a lista de peças simples.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteSimplePartItem(id);
      onListChanged();
      showSuccess('Item removido da lista.');
    } catch (error) {
      showError('Erro ao remover item da lista.');
    }
  };

  // Arrastar pela alça (dnd-kit): a ordem manual desfaz a ordenação por coluna
  const handleReorder = (ids: string[]) => {
    const byId = new Map(orderedItems.map((i) => [i.id, i]));
    const reordered = ids.map((id) => byId.get(id)!).filter(Boolean);
    setSortField(null);
    setOrderedItems(reordered);
    onListReordered(reordered);
  };

  // --- Inline Edit Handlers (Desktop Only) ---
  const handleEditClick = (item: SimplePartItem) => {
    if (isMobile) {
      onOpenEditForm(item); // Abre o formulário externo em mobile
      return;
    }
    // Lógica de edição inline para desktop
    setEditingItemId(item.id);
    setFormQuantity(item.quantidade ?? 1);
    setFormQuantityError(false);
    setFormAf(item.af || '');
    setFormPartCode(item.codigo_peca || ''); // Define o código da peça confirmada
    setFormDescription(item.descricao || ''); // Define a descrição da peça confirmada
    setSearchQueryForEdit(''); // Limpa a query de busca para começar uma nova busca
  };

  const handleSaveEdit = async (originalItem: SimplePartItem) => {
    if (!formPartCode.trim() && !formDescription.trim()) {
      showError('O Código da Peça ou a Descrição são obrigatórios.');
      return;
    }
    const qtyNum = formQuantity === "" ? 0 : Number(formQuantity);
    if (formQuantity === "" || isNaN(qtyNum) || qtyNum <= 0) {
      setFormQuantityError(true);
      showError('O valor da quantidade tem que ser maior que "0"');
      return;
    }

    const updatedItem: SimplePartItem = {
      ...originalItem,
      quantidade: qtyNum,
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
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSelectPartForEdit = (part: Part | null) => {
    if (part) {
      setFormPartCode(part.codigo);
      setFormDescription(part.descricao);
      setSearchQueryForEdit(''); // Limpa o campo de busca após a seleção
    } else {
      setFormPartCode('');
      setFormDescription('');
      setSearchQueryForEdit('');
    }
  };

  const handlePartSearchChangeForEdit = (value: string) => {
    setSearchQueryForEdit(value); // Atualiza apenas a query de busca
    // Não limpa formPartCode/formDescription aqui, eles só mudam na seleção
  };

  const handleAfSelectForEdit = (afNumber: string) => {
    setFormAf(afNumber);
  };
  // --- End Inline Edit Handlers ---

  // --- Inline Add Handlers (Desktop Only) ---
  const handleToggleInlineAdd = () => {
    if (isMobile) return; // Desabilita em mobile
    setIsAddingInline(prev => !prev);
    if (!isAddingInline) { // Se está abrindo o formulário
      setInlineFormQuantity(1);
      setInlineFormQuantityError(false);
      setInlineFormAf('');
      setInlineFormPartCode('');
      setInlineFormDescription('');
      setInlineSearchQuery(''); // Limpa a query de busca
      setEditingItemId(null); // Fecha o inline edit se estiver aberto
    }
  };

  const handleSaveInlineAdd = async () => {
    if (!inlineFormPartCode.trim() && !inlineFormDescription.trim()) {
      showError('O Código da Peça ou a Descrição são obrigatórios.');
      return;
    }
    const qtyNum = inlineFormQuantity === "" ? 0 : Number(inlineFormQuantity);
    if (inlineFormQuantity === "" || isNaN(qtyNum) || qtyNum <= 0) {
      setInlineFormQuantityError(true);
      showError('O valor da quantidade tem que ser maior que "0"');
      return;
    }

    const newItem: Omit<SimplePartItem, 'id'> = {
      quantidade: qtyNum,
      af: inlineFormAf.trim() || undefined,
      codigo_peca: inlineFormPartCode.trim(),
      descricao: inlineFormDescription.trim(),
    };

    try {
      await addSimplePartItem(newItem, company);
      showSuccess('Novo item adicionado com sucesso!');
      setIsAddingInline(false);
      onListChanged();
    } catch (error) {
      showError('Erro ao adicionar novo item.');
    }
  };

  const handleCancelInlineAdd = () => {
    setIsAddingInline(false);
  };

  const handleSelectPartForInlineAdd = (part: Part | null) => {
    if (part) {
      setInlineFormPartCode(part.codigo);
      setInlineFormDescription(part.descricao);
      setInlineSearchQuery(''); // Limpa o campo de busca após a seleção
    } else {
      setInlineFormPartCode('');
      setInlineFormDescription('');
      setInlineSearchQuery('');
    }
  };

  const handlePartSearchChangeForInlineAdd = (value: string) => {
    setInlineSearchQuery(value); // Atualiza apenas a query de busca
  };

  const handleAfSelectForInlineAdd = (afNumber: string) => {
    setInlineFormAf(afNumber);
  };
  // --- End Inline Add Handlers ---

  const dragEnabled = !editingItemId && !isAddingInline && !groupByAf;

  const renderRow = (item: SimplePartItem) => {
    const relatedItems = relatedFor(relatedPartsCache, item.codigo_peca);
    const partName = nameFor(relatedPartsCache, item);
    const label = item.codigo_peca || item.descricao || 'peça';
    const flash = flashIds.has(item.id);
    const cells = (
      <>
        <TableCell className="w-[40px] p-1">
          {dragEnabled ? (
            <DragHandle className="h-8 w-8" label={`Arrastar ${label}`} />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center text-muted-foreground/30"
              title={groupByAf ? 'Desligue o agrupamento por AF para arrastar' : 'Termine a edição para arrastar'}
              role="img"
              aria-label="Arrastar desativado"
              data-testid="drag-handle-disabled"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
        </TableCell>
        {editingItemId === item.id && !isMobile ? ( // Inline edit only on desktop
                  <>
                    <TableCell className="w-auto whitespace-normal break-words p-2 space-y-1">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`edit-search-part-${item.id}`} className="sr-only">Buscar Peça</Label>
                        <PartSearchInput
                          onSearch={handlePartSearchChangeForEdit} // Atualiza apenas a query de busca
                          searchResults={searchResultsForEdit}
                          onSelectPart={handleSelectPartForEdit} // Atualiza os campos de código/descrição e limpa a busca
                          searchQuery={searchQueryForEdit} // Exibe a query de busca
                          isLoading={isLoadingParts}
                        />
                        <div className="grid grid-cols-3 gap-2"> {/* Layout para Código e Descrição */}
                      <div className="col-span-1"> {/* Código da Peça: menor */}
                        <Label htmlFor={`edit-part-code-${item.id}`} className="sr-only">Código da Peça</Label>
                        <Input
                          id={`edit-part-code-${item.id}`}
                          type="text"
                          value={formPartCode} // Exibe o código da peça selecionada
                          readOnly // Somente leitura
                          placeholder="Código da peça"
                          className="text-xs bg-muted"
                        />
                      </div>
                      <div className="col-span-2"> {/* Descrição: maior */}
                        <Label htmlFor={`edit-description-${item.id}`} className="sr-only">Descrição</Label>
                        <Input
                          id={`edit-description-${item.id}`}
                          type="text"
                          value={formDescription} // Exibe a descrição da peça selecionada
                          readOnly // Somente leitura
                          placeholder="Descrição da peça"
                          className="text-xs bg-muted"
                        />
                      </div>
                    </div>
                        <Label htmlFor={`edit-af-${item.id}`} className="sr-only">AF</Label>
                        <AfSearchInput
                          value={formAf}
                          onChange={setFormAf}
                          availableAfs={allAvailableAfs}
                          onSelectAf={handleAfSelectForEdit}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="w-[4rem] p-2 text-center"> {/* Largura ajustada */}
                      <Label htmlFor={`edit-quantity-${item.id}`} className="sr-only">Quantidade</Label>
                      <Input
                        id={`edit-quantity-${item.id}`}
                        type="number"
                        value={formQuantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setFormQuantity('');
                          } else {
                            const parsed = parseInt(val, 10);
                            setFormQuantity(isNaN(parsed) ? '' : parsed);
                          }
                          setFormQuantityError(false);
                        }}
                        className={cn("w-full text-center", formQuantityError && "border-destructive focus-visible:ring-destructive")}
                      />
                      {formQuantityError && (
                        <p className="text-[10px] text-destructive mt-1">O valor tem que ser maior que "0"</p>
                      )}
                    </TableCell>
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
                    <TableCell className="w-auto whitespace-normal break-words p-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm"><span data-testid="parts-list-row-code">{item.codigo_peca || 'N/A'}</span>{partName && ` · ${partName}`}</span>
                        <span className="text-xs text-muted-foreground">{item.descricao || 'N/A'}</span>
                        {item.af && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 mt-1">AF: {item.af}</span>
                        )}
                        {relatedItems.length > 0 && (
                          <ResponsivePopover>
                            <ResponsivePopoverTrigger>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 cursor-pointer h-auto py-0 px-1"
                              >
                                <Tag className="h-3 w-3" /> {relatedItems.length} item(s) relacionado(s)
                              </Button>
                            </ResponsivePopoverTrigger>
                            <ResponsivePopoverContent title="Itens Relacionados" popoverClassName="w-auto max-w-xs p-2">
                              <p className="hidden lg:block font-bold mb-1 text-sm">Itens Relacionados:</p>
                              <ScrollArea className="max-h-96">
                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                  {relatedItems.map(rel => (
                                    <li key={rel.codigo} className="list-none ml-0">
                                      <RelatedPartDisplay item={rel} />
                                    </li>
                                  ))}
                                </ul>
                              </ScrollArea>
                            </ResponsivePopoverContent>
                          </ResponsivePopover>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="w-[4rem] p-2 text-center font-medium">{item.quantidade ?? 'N/A'}</TableCell> {/* Largura ajustada */}
                    
                    <TableCell className="w-[80px] p-2 text-right">
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1"> {/* Alterado para flex-col em mobile */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Item</TooltipContent>
                        </Tooltip>
                        <AlertDialog>
                          <Tooltip> {/* Tooltip envolve o AlertDialogTrigger */}
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Remover Item</TooltipContent>
                          </Tooltip>
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
      </>
    );
    const rowProps = {
      className: cn(flash && 'bg-primary/10 animate-pulse'),
      'data-testid': 'parts-list-row',
      'data-item-id': item.id,
      'data-flash': flash || undefined,
    };
    return dragEnabled ? (
      <SortableTableRow key={item.id} id={item.id} {...rowProps}>{cells}</SortableTableRow>
    ) : (
      <TableRow key={item.id} {...rowProps}>{cells}</TableRow>
    );
  };

  const renderOverlay = (id: string) => {
    const item = orderedItems.find((i) => i.id === id);
    if (!item) return null;
    const partName = nameFor(relatedPartsCache, item);
    return (
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <span className="block font-medium text-sm truncate">{item.codigo_peca || 'N/A'}{partName && ` · ${partName}`}</span>
          <span className="block text-xs text-muted-foreground truncate">{item.descricao || 'N/A'}</span>
        </div>
        <span className="w-[4rem] text-center font-medium">{item.quantidade ?? 'N/A'}</span>
      </div>
    );
  };

  // Agrupamento por AF (linhas de título dentro da tabela)
  const renderGroupedRows = () => {
    const map = new Map<string, SimplePartItem[]>();
    orderedItems.forEach((i) => {
      const key = (i.af || '').trim();
      const arr = map.get(key);
      if (arr) arr.push(i);
      else map.set(key, [i]);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b, undefined, { numeric: true });
      })
      .map(([af, groupItems]) => (
        <React.Fragment key={af || '__none'}>
          <TableRow className="bg-muted/40 hover:bg-muted/40" data-testid="parts-list-af-group">
            <TableCell colSpan={4} className="p-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {af ? `AF ${af}` : 'Sem AF'} ({groupItems.length})
            </TableCell>
          </TableRow>
          {groupItems.map(renderRow)}
        </React.Fragment>
      ));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Lista de Peças ({branding.name})</CardTitle>
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
        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setSortOpen(true)}
            disabled={orderedItems.length < 2}
            data-testid="parts-list-sort-button"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Ordenar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setClearConfirm(true)}
            disabled={orderedItems.length === 0}
            data-testid="parts-list-clear-button"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Lista
          </Button>
          <Button onClick={share.open} data-testid="parts-list-share-button">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
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
                  <TableHead className="w-[40px] p-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" /> {/* Drag handle header */}
                  </TableHead>
                  <TableHead className="w-auto p-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSort('codigo')}
                        className={cn(
                          "font-bold hover:text-primary transition-colors cursor-pointer select-none focus:outline-none flex items-center gap-0.5",
                          sortField === 'codigo' && "text-primary"
                        )}
                      >
                        Código{getSortIndicator('codigo')}
                      </button>
                      <span className="text-muted-foreground">/</span>
                      <button
                        type="button"
                        onClick={() => handleSort('descricao')}
                        className={cn(
                          "font-bold hover:text-primary transition-colors cursor-pointer select-none focus:outline-none flex items-center gap-0.5",
                          sortField === 'descricao' && "text-primary"
                        )}
                      >
                        Descrição{getSortIndicator('descricao')}
                      </button>
                      <span className="text-muted-foreground">/</span>
                      <button
                        type="button"
                        onClick={() => handleSort('af')}
                        className={cn(
                          "font-bold hover:text-primary transition-colors cursor-pointer select-none focus:outline-none flex items-center gap-0.5",
                          sortField === 'af' && "text-primary"
                        )}
                      >
                        AF{getSortIndicator('af')}
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="w-[4rem] p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort('quantidade')}
                      className={cn(
                        "font-bold hover:text-primary transition-colors cursor-pointer select-none focus:outline-none w-full text-center flex items-center justify-center gap-0.5",
                        sortField === 'quantidade' && "text-primary"
                      )}
                    >
                      Qtd{getSortIndicator('quantidade')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px] p-2 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              {dragEnabled ? (
                <SortableTableBody ids={orderedItems.map((i) => i.id)} onReorder={handleReorder} renderOverlay={renderOverlay}>
                  {orderedItems.map(renderRow)}
                </SortableTableBody>
              ) : (
                <TableBody>
                  {groupByAf ? renderGroupedRows() : orderedItems.map(renderRow)}
                  {isAddingInline && !isMobile && ( // Inline add only on desktop
                    <TableRow className="bg-accent/10">
                      <TableCell className="w-[40px] p-2"></TableCell>
                      <TableCell className="w-auto whitespace-normal break-words p-2 space-y-1">
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="inline-search-part" className="sr-only">Buscar Peça</Label>
                          <PartSearchInput
                            onSearch={handlePartSearchChangeForInlineAdd}
                            searchResults={inlineSearchResults}
                            onSelectPart={handleSelectPartForInlineAdd}
                            searchQuery={inlineSearchQuery}
                            isLoading={isLoadingParts}
                          />
                          <div className="grid grid-cols-3 gap-2"> {/* Layout para Código e Descrição */}
                            <div className="col-span-1"> {/* Código da Peça: menor */}
                              <Label htmlFor="inline-part-code" className="sr-only">Código da Peça</Label>
                              <Input
                                id="inline-part-code"
                                type="text"
                                value={inlineFormPartCode}
                                readOnly
                                placeholder="Código da peça"
                                className="text-xs bg-muted"
                              />
                            </div>
                            <div className="col-span-2"> {/* Descrição: maior */}
                              <Label htmlFor="inline-description" className="sr-only">Descrição</Label>
                              <Input
                                id="inline-description"
                                type="text"
                                value={inlineFormDescription}
                                readOnly
                                placeholder="Descrição da peça"
                                className="text-xs bg-muted"
                              />
                            </div>
                          </div>
                          <Label htmlFor="inline-af" className="sr-only">AF</Label>
                          <AfSearchInput
                            value={inlineFormAf}
                            onChange={setInlineFormAf}
                            availableAfs={allAvailableAfs}
                            onSelectAf={handleAfSelectForInlineAdd}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="w-[4rem] p-2 text-center"> {/* Largura ajustada */}
                        <Label htmlFor="inline-quantity" className="sr-only">Quantidade</Label>
                        <Input
                          id="inline-quantity"
                          type="number"
                          value={inlineFormQuantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setInlineFormQuantity('');
                            } else {
                              const parsed = parseInt(val, 10);
                              setInlineFormQuantity(isNaN(parsed) ? '' : parsed);
                            }
                            setInlineFormQuantityError(false);
                          }}
                          className={cn("w-full text-center", inlineFormQuantityError && "border-destructive focus-visible:ring-destructive")}
                        />
                        {inlineFormQuantityError && (
                          <p className="text-[10px] text-destructive mt-1">O valor tem que ser maior que "0"</p>
                        )}
                      </TableCell>
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
              )}
            </Table>
          </div>
        )}
        {!isMobile && ( // Botão de adicionar inline apenas no desktop
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
        )}
      </CardContent>

      <PartsListSortSheet
        open={sortOpen}
        onOpenChange={setSortOpen}
        onSort={handleSheetSort}
        groupByAf={groupByAf}
        onToggleGroupByAf={() => setGroupByAf((v) => !v)}
      />

      {share.element}

      <AlertDialog open={clearConfirm} onOpenChange={setClearConfirm}>
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
    </Card>
  );
};

export default PartsListDisplay;