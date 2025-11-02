import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, List as ListIcon, Copy, Download, FileText, Edit } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError } from '@/utils/toast';
import { getCustomListItems, getCustomListById } from '@/services/customListService';
import { CustomListItem } from '@/types/supabase';
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { generateCustomListPdf } from '@/lib/pdfGenerator'; // Importar nova função
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import RelatedItemsHoverCard from '@/components/RelatedItemsHoverCard'; // Importar o novo componente
import CustomListEditor from '@/components/CustomListEditor'; // Importar o editor
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Para o modal de edição
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // Para o modal de edição em mobile
import { useIsMobile } from '@/hooks/use-mobile'; // Para detectar mobile

const CustomListPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [listTitle, setListTitle] = useState('Carregando Lista...');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CustomListItem | null>(null);

  const isMobile = useIsMobile(); // Detecta se é mobile

  const loadList = useCallback(async () => {
    if (!listId) return;
    setIsLoading(true);
    try {
      // 1. Buscar o título da lista
      const listData = await getCustomListById(listId);
      if (listData) {
        setListTitle(listData.title);
      } else {
        setListTitle('Lista Não Encontrada');
        showError('Lista não encontrada ou você não tem permissão para acessá-la.');
        setIsLoading(false);
        return;
      }

      // 2. Buscar os itens da lista
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

  useEffect(() => {
    loadList();
  }, [loadList]);

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
    loadList(); // Recarrega a lista para refletir as alterações
  };

  const ModalComponent = isMobile ? Sheet : Dialog;
  const ModalContentComponent = isMobile ? SheetContent : DialogContent;
  const ModalHeaderComponent = isMobile ? SheetHeader : DialogHeader;
  const ModalTitleComponent = isMobile ? SheetTitle : DialogTitle;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 mt-8">
        <Link to="/custom-menu-view">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Catálogo
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
            {/* Copiar Lista */}
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
            
            {/* Exportar CSV */}
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
            
            {/* Exportar PDF */}
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
                    <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                    <TableHead className="w-auto whitespace-normal break-words p-2">Item / Código / Descrição</TableHead>
                    <TableHead className="w-[40px] p-2 text-right">Ações</TableHead> {/* Nova coluna de ações */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium p-2 text-center">{item.quantity}</TableCell>
                      <TableCell className="w-auto whitespace-normal break-words p-2">
                        <RelatedItemsHoverCard
                          partCode={item.part_code}
                          itemName={item.item_name}
                          excludeItemId={item.id}
                          excludeListId={item.list_id}
                        >
                          <div className="flex flex-col">
                            {item.part_code && (
                              <span className="font-medium text-sm text-primary">{item.part_code}</span>
                            )}
                            <span className={cn("text-sm", !item.part_code && 'font-medium')}>{item.item_name}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground italic truncate max-w-full">{item.description}</span>
                            )}
                          </div>
                        </RelatedItemsHoverCard>
                      </TableCell>
                      <TableCell className="w-[40px] p-2 text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEditItemClick(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Item</TooltipContent>
                        </Tooltip>
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

      {/* Modal de Edição (Dialog para desktop, Sheet para mobile) */}
      <ModalComponent open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <ModalContentComponent className={isMobile ? "w-full sm:max-w-lg overflow-y-auto" : "sm:max-w-[425px]"}>
          <ModalHeaderComponent>
            <ModalTitleComponent>Editar Item da Lista</ModalTitleComponent>
          </ModalHeaderComponent>
          {itemToEdit && listId && (
            <CustomListEditor
              list={{ id: listId, title: listTitle, user_id: '' }} // Passa um objeto CustomList mínimo
              onClose={handleItemSavedOrClosed}
              editingItem={itemToEdit}
              onItemSaved={handleItemSavedOrClosed}
            />
          )}
        </ModalContentComponent>
      </ModalComponent>
    </div>
  );
};

export default CustomListPage;