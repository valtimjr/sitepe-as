import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePartItem, clearSimplePartsList, deleteSimplePartItem } from '@/services/partListService';
import { generatePartsListPdf } from '@/lib/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, Download, Copy } from 'lucide-react';
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


interface PartsListDisplayProps {
  listItems: SimplePartItem[];
  onListChanged: () => void;
  listTitle: string;
  onTitleChange: (title: string) => void;
}

const PartsListDisplay: React.FC<PartsListDisplayProps> = ({ listItems, onListChanged, listTitle, onTitleChange }) => {
  const displayedItems = listItems;

  const handleExportPdf = () => {
    if (displayedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    // Passa o título personalizado para a função de geração de PDF
    generatePartsListPdf(displayedItems, listTitle);
    showSuccess('PDF gerado com sucesso!');
  };

  // Nova função para formatar o texto agrupado por AF
  const formatListTextGroupedByAf = () => {
    if (displayedItems.length === 0) return '';

    // 1. Agrupar e ordenar itens
    const groupedByAf: { [key: string]: SimplePartItem[] } = {};
    displayedItems.forEach(item => {
      const afKey = item.af || 'SEM_AF';
      if (!groupedByAf[afKey]) {
        groupedByAf[afKey] = [];
      }
      groupedByAf[afKey].push(item);
    });

    // Ordenar as chaves (AFs) numericamente, colocando 'SEM_AF' por último
    const sortedAfKeys = Object.keys(groupedByAf).sort((a, b) => {
      if (a === 'SEM_AF') return 1;
      if (b === 'SEM_AF') return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    let formattedText = '';

    // 2. Adicionar o título da lista
    formattedText += `${listTitle}\n\n`;

    // 3. Iterar sobre os grupos e formatar
    sortedAfKeys.forEach(afKey => {
      const items = groupedByAf[afKey];
      const afDisplay = afKey === 'SEM_AF' ? 'SEM AF' : afKey;

      formattedText += `AF:${afDisplay}\n`;

      items.forEach(item => {
        const quantidade = item.quantidade ?? 1;
        const codigo = item.codigo_peca || '';
        const descricao = item.descricao || '';
        
        // Formato: [QUANTIDADE] - [CÓDIGO] [DESCRIÇÃO]
        formattedText += `${quantidade} - ${codigo} ${descricao}`.trim() + '\n';
      });
      formattedText += '\n'; // Linha em branco entre grupos
    });

    return formattedText.trim();
  };

  const handleCopyList = async () => {
    if (displayedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    const textToCopy = formatListTextGroupedByAf();

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de peças copiada para a área de transferência!');
    } catch (err) {
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
      console.error('Failed to copy list items:', err);
    }
  };

  const handleShareOnWhatsApp = () => {
    if (displayedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de compartilhar.');
      return;
    }

    const textToShare = formatListTextGroupedByAf();
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
              disabled={displayedItems.length === 0} 
              size="icon"
              className="sm:w-auto sm:px-4"
            >
              <Copy className="h-4 w-4" /> 
              <span className="hidden sm:inline ml-2">Copiar Lista</span>
            </Button>
            <Button 
              onClick={handleShareOnWhatsApp} 
              disabled={displayedItems.length === 0} 
              variant="ghost" 
              className="h-10 w-10 p-0 rounded-full" 
              aria-label="Compartilhar no WhatsApp" 
            >
              <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-10 w-10" />
            </Button>
            <Button onClick={handleExportPdf} disabled={displayedItems.length === 0} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={displayedItems.length === 0} 
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
        {displayedItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item na lista. Adicione peças para começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Coluna principal combinada */}
                  <TableHead className="w-auto whitespace-normal break-words p-2">Peça (Cód. / Descrição / AF)</TableHead>
                  {/* Colunas compactas */}
                  <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                  <TableHead className="w-[40px] p-2 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedItems.map((item) => (
                  <TableRow key={item.id}>
                    {/* Célula principal com Código, Descrição e AF */}
                    <TableCell className="w-auto whitespace-normal break-words p-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{item.codigo_peca || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{item.descricao || 'N/A'}</span>
                        {item.af && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 mt-1">AF: {item.af}</span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Coluna Quantidade */}
                    <TableCell className="w-[4rem] p-2 text-center font-medium">{item.quantidade ?? 'N/A'}</TableCell>
                    
                    {/* Coluna Ações */}
                    <TableCell className="w-[40px] p-2 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remover item</TooltipContent>
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
  );
};

export default PartsListDisplay;