"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, List as ListIcon, Copy, Download, FileText, Tag, Info, Loader2, FileDown, Check, PlusCircle, XCircle } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { getCustomListItems, getCustomListById } from '@/services/customListService';
import { CustomList, CustomListItem, Part, RelatedPart, MangueiraItemData } from '@/types/supabase';
import { exportDataAsCsv, exportDataAsJson, addSimplePartItem, getAfsFromService, Af, getParts } from '@/services/partListService';
import { lazyGenerateCustomListPdf } from '@/utils/pdfExportUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import AfSearchInput from '@/components/AfSearchInput';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

const CustomListPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const location = useLocation();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [listTitle, setListTitle] = useState('Carregando Lista...');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [afForExport, setAfForExport] = useState('');
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);
  const [isLoadingAfs, setIsLoadingAfs] = useState(true);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);

  const [openRelatedItemsPopoverId, setOpenRelatedItemsPopoverId] = useState<string | null>(null);

  const isMobile = useIsMobile();

  const loadList = useCallback(async () => {
    if (!listId) return;
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

  useEffect(() => {
    if (!isLoading && location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [isLoading, location.hash, items]);

  const itemsToProcess = useMemo(() => {
    if (selectedItemIds.size === 0) {
      return items;
    }

    // Filtra para incluir itens selecionados e os subtítulos/separadores relevantes
    const finalItems = items.filter((item, index) => {
      // Sempre inclui itens selecionados
      if (selectedItemIds.has(item.id)) {
        return true;
      }

      // Inclui subtítulos ou separadores apenas se houver um item selecionado dentro de seu "grupo"
      if (item.type === 'subtitle' || item.type === 'separator') {
        // Encontra o próximo subtítulo ou separador para definir o limite do grupo
        let nextBoundaryIndex = items.findIndex((nextItem, nextIndex) => 
          nextIndex > index && (nextItem.type === 'subtitle' || nextItem.type === 'separator')
        );
        if (nextBoundaryIndex === -1) {
          nextBoundaryIndex = items.length;
        }
        
        // Verifica se algum item dentro deste grupo está selecionado
        const itemsInGroup = items.slice(index + 1, nextBoundaryIndex);
        return itemsInGroup.some(groupItem => selectedItemIds.has(groupItem.id));
      }

      return false;
    });

    return finalItems;
  }, [items, selectedItemIds]);

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
      formattedText += `${quantidade} - ${nome} ${descricao}${codigo}`.trim() + '\n';
    });
    return formattedText.trim();
  };

  const handleCopyList = async () => {
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
    if (itemsToProcess.length === 0) {
      showError('Nenhum item para exportar.');
      return;
    }
    exportDataAsCsv(itemsToProcess, `${listTitle.replace(/\s/g, '_')}_itens.csv`);
    showSuccess('Lista exportada para CSV com sucesso!');
  };

  const handleExportPdf = async () => {
    if (itemsToProcess.length === 0) {
      showError('Nenhum item para exportar.');
      return;
    }
    await lazyGenerateCustomListPdf(itemsToProcess, listTitle);
    showSuccess('PDF gerado com sucesso!');
  };

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

  const handleExportSelectedToMyList = () => {
    if (selectedItemIds.size === 0) {
      showError('Nenhum item selecionado para exportar.');
      return;
    }
    setAfForExport('');
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

    const previousItem = index > 0 ? items[index - 1] : null;
    const showMangueiraHeader = isMangueira && (!previousItem || previousItem.type !== 'mangueira');

    if (isSeparator) {
      return (
        <TableRow key={item.id} id={item.id} className="bg-muted/50 border-y border-dashed">
          <TableCell colSpan={isMobile ? 4 : 6} className="text-center font-mono text-sm font-bold text-foreground italic p-2">
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
        <TableRow key={item.id} id={item.id} className="bg-accent/10 hover:bg-accent/50 border-y-2 border-primary/50">
          <TableCell className="w-[40px] p-2">
            <Checkbox
              checked={isGroupAllSelected ? true : isGroupIndeterminate ? 'indeterminate' : false}
              onCheckedChange={(checked) => handleSubtitleSelect(item, checked === true)}
              aria-label={`Selecionar todos os itens em ${item.item_name}`}
            />
          </TableCell>
          <TableCell colSpan={isMobile ? 3 : 5} className="text-left font-bold text-lg text-primary p-2">
            {item.item_name}
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
              <TableHead className="w-[40px] p-2"></TableHead>
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
          )}
          <TableRow key={item.id} id={item.id}>
            <TableCell className="w-[40px] p-2">
              <Checkbox
                checked={selectedItemIds.has(item.id)}
                onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
                aria-label={`Selecionar item ${item.item_name}`}
              />
            </TableCell>
            <TableCell className="w-[4rem] p-2 text-center font-medium">1</TableCell>
            <TableCell className="w-auto whitespace-normal break-words p-2 text-left">
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm text-primary whitespace-normal break-words">Cód.: {data.mangueira.codigo}</span>
                <span className="text-[9pt] text-foreground whitespace-normal break-words">{data.mangueira.name}</span>
                {data.mangueira.description && (
                  <span className="text-[8pt] italic text-foreground/90 max-w-full whitespace-normal break-words">{data.mangueira.description}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="w-[6rem] p-2 text-center font-medium text-lg">
              {data.corte_cm}
            </TableCell>
            {isMobile ? (
              <TableCell className="w-auto p-2" colSpan={2}>
                <div className="flex flex-col items-start space-y-2">
                  <div>
                    <span className="font-medium text-sm text-primary">C1: {data.conexao1.codigo}</span>
                    <span className="text-[9pt] text-foreground block">{data.conexao1.name}</span>
                    {data.conexao1.description && <span className="text-[8pt] italic text-foreground/90 block">{data.conexao1.description}</span>}
                  </div>
                  <div>
                    <span className="font-medium text-sm text-primary">C2: {data.conexao2.codigo}</span>
                    <span className="text-[9pt] text-foreground block">{data.conexao2.name}</span>
                    {data.conexao2.description && <span className="text-[8pt] italic text-foreground/90 block">{data.conexao2.description}</span>}
                  </div>
                </div>
              </TableCell>
            ) : (
              <>
                <TableCell className="w-auto p-2">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm text-primary whitespace-normal break-words">Cód.: {data.conexao1.codigo}</span>
                    <span className="text-[9pt] text-foreground whitespace-normal break-words">{data.conexao1.name}</span>
                    {data.conexao1.description && (
                      <span className="text-[8pt] italic text-foreground/90 max-w-full whitespace-normal break-words">{data.conexao1.description}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-auto p-2">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm text-primary whitespace-normal break-words">Cód.: {data.conexao2.codigo}</span>
                    <span className="text-[9pt] text-foreground whitespace-normal break-words">{data.conexao2.name}</span>
                    {data.conexao2.description && (
                      <span className="text-[8pt] italic text-foreground/90 max-w-full whitespace-normal break-words">{data.conexao2.description}</span>
                    )}
                  </div>
                </TableCell>
              </>
            )}
          </TableRow>
        </React.Fragment>
      );
    }

    return (
      <TableRow key={item.id} id={item.id}>
        <TableCell className="w-[40px] p-2">
          <Checkbox
            checked={selectedItemIds.has(item.id)}
            onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
            aria-label={`Selecionar item ${item.item_name}`}
          />
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
      </Card>
      <MadeWithDyad />

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