import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, List as ListIcon, Copy, Download, FileText } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError } from '@/utils/toast';
import { getCustomListItems, getCustomListById } from '@/services/customListService';
import { CustomListItem } from '@/types/supabase';
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { generateCustomListPdf } from '@/lib/pdfGenerator';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

const CustomListPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [listTitle, setListTitle] = useState('Carregando Lista...');
  const [isLoading, setIsLoading] = useState(true);

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
                    <TableHead className="w-auto p-2">Item / Código / Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium p-2 text-center">{item.quantity}</TableCell>
                      <TableCell className="w-auto p-2">
                        <div className="flex flex-col">
                          {item.part_code && (
                            <span className="font-medium text-sm text-primary">{item.part_code}</span>
                          )}
                          {/* Removido truncate e max-w-full para forçar a quebra de linha */}
                          <span className={cn("text-sm whitespace-normal break-words", !item.part_code && 'font-medium')}>{item.item_name}</span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground italic whitespace-normal break-words">{item.description}</span>
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
    </div>
  );
};

export default CustomListPage;