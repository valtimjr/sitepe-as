import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, List as ListIcon, Copy, Download, FileText, Edit, Tag, Info, Check, PlusCircle, XCircle } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { getCustomListItems, getCustomListById } from '@/services/customListService';
import { CustomList, CustomListItem } from '@/types/supabase';
import { exportDataAsCsv, exportDataAsJson, addSimplePartItem, getAfsFromService, Af } from '@/services/partListService';
import { generateCustomListPdf } from '@/lib/pdfGenerator';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import CustomListEditor from '@/components/CustomListEditor';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import AfSearchInput from '@/components/AfSearchInput';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
      showError('Erro ao carregar a lista personalizada.');
      console.error('Failed to load custom list:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  const loadAfs = useCallback(async () => {
    setIsLoadingAfs(true);
    try {
      const afs = await getAfsFromService();
      setAllAvailableAfs(afs);
    } catch (error) {
      console.error('Failed to load AFs:', error);
    } finally {
      setIsLoadingAfs(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    loadAfs();
  }, [loadList, loadAfs]);

  useEffect(() => {
    document.title = `${listTitle} - AutoBoard`;
  }, [listTitle]);

  const formatListText = () => {
    if (items.length === 0) return '';

    let formattedText = `${listTitle}\n\n`;

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
    exportDataAsCsv(items, `${listTitle.replace(/\s/g, '_')}_itens.csv`);
    showSuccess('Lista exportada para CSV com sucesso!');
  };

  const handleExportPdf = () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    generateCustomListPdf(items, listTitle);
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
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleItemIds = new Set(items.map(item => item.id));
      setSelectedItemIds(allVisibleItemIds);
    } else {
      setSelectedItemIds(new Set());
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

  const isAllSelected = items.length > 0 && selectedItemIds.size === items.length;
  const isIndeterminate = selectedItemIds.size > 0 && selectedItemIds.size < items.length;

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
      showError(`Erro ao exportar itens para 'Minha Lista de Peças'.`);
      console.error('Failed to export items to simple parts list:', error);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  return (
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
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {selectedItemIds.size > 0 && (
              <Button 
                onClick={handleExportSelectedToMyList} 
                className="flex items-center gap-2"
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
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isIndeterminate ? true : undefined}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label="Selecionar todos os itens"
                      />
                    </TableHead>
                    <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                    <TableHead className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="w-[40px] p-2">
                        <Checkbox
                          checked={selectedItemIds.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked === true)}
                          aria-label={`Selecionar item ${item.item_name}`}
                        />
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
                            {item.itens_relacionados && item.itens_relacionados.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 cursor-help">
                                    <Tag className="h-3 w-3" /> {item.itens_relacionados.length} item(s) relacionado(s)
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-bold mb-1">Itens Relacionados:</p>
                                  <ul className="list-disc list-inside">
                                    {item.itens_relacionados.map(rel => <li key={rel}>{rel}</li>)}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />

      {/* Sheet de Edição */}
      <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Item da Lista</SheetTitle>
          </SheetHeader>
          {itemToEdit && listId && (
            <CustomListEditor
              list={{ id: listId, title: listTitle, user_id: '' }}
              onClose={handleItemSavedOrClosed}
              editingItem={itemToEdit}
              onItemSaved={handleItemSavedOrClosed}
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