"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, List as ListIcon, Copy, Download, FileText, Edit, Tag, Info, Check, PlusCircle, XCircle, FileDown, Minus } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { getCustomListItems, getCustomListById } from '@/services/customListService';
import { CustomList, CustomListItem, Part } from '@/types/supabase';
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

const CustomListPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
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
  const [isRelatedItemsPopoverOpen, setIsRelatedItemsPopoverOpen] = useState<string | null>(null);

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
  const selectableItems = useMemo(() => items.filter(i => i.type === 'item'), [items]);
  const isAllSelected = selectableItems.length > 0 && selectedItemIds.size === selectableItems.length;
  const isIndeterminate = selectedItemIds.size > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    // Se todos já estiverem selecionados, limpa a seleção.
    // Caso contrário (se nenhum ou alguns estiverem selecionados), seleciona todos.
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
        await addSimplePartItem({
          codigo_peca: item.part_code || '',
          descricao: item.description || item.item_name,
          quantidade: item.quantity,
          af: afForExport.trim(),
        });
      }
      showSuccess(`${itemsToExport.length} itens exportados para 'Minha Lista de Peças' com sucesso!`);
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

  const renderItemRow = (item: CustomListItem) => {
    const isSeparator = item.type === 'separator';
    const isSubtitle = item.type === 'subtitle';
    const isItem = item.type === 'item';

    if (isSeparator) {
      return (
        <TableRow key={item.id} className="bg-muted/50 border-y border-dashed">
          <TableCell colSpan={4} className="text-center font-mono text-sm font-bold text-foreground italic p-2">
            <Separator className="my-0 bg-foreground/50 h-px" />
          </TableCell>
        </TableRow>
      );
    }

    if (isSubtitle) {
      return (
        <TableRow key={item.id} className="bg-accent/10 border-y border-primary/50">
          <TableCell colSpan={4} className="text-left font-bold text-lg text-primary p-2">
            {item.item_name}
          </TableCell>
        </TableRow>
      );
    }

    // Item de peça normal
    return (
      <TableRow key={item.id}>
        <TableCell className="w-[40px] p-2">
          <Checkbox
            checked={selectedItemIds.has(item.id)}
            onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
            aria-label={`Selecionar item ${item.item_name}`}
          />
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
                  open={isRelatedItemsPopoverOpen === item.id} 
                  onOpenChange={(open) => setIsRelatedItemsPopoverOpen(open ? item.id : null)}
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
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                      {item.itens_relacionados.map(rel => (
                        <li key={rel} className="list-none ml-0">
                          <RelatedPartDisplay formattedString={rel} />
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              )}
            </div>
        </TableCell>
        <TableCell className="w-[70px] p-2 text-right">
          {/* Botão de Edição Removido */}
          {/* <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item)} className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar Item</TooltipContent>
            </Tooltip>
          </div> */}
        </TableCell>
      </TableRow>
    );
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
    </React.Fragment>
  );
};

export default CustomListPage;