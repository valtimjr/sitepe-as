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


interface PartsListDisplayProps {
  listItems: SimplePartItem[];
  onListChanged: () => void;
}

const PartsListDisplay: React.FC<PartsListDisplayProps> = ({ listItems, onListChanged }) => {
  const displayedItems = listItems;

  const handleExportPdf = () => {
    if (displayedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    generatePartsListPdf(displayedItems, 'Lista de Peças Simples');
    showSuccess('PDF gerado com sucesso!');
  };

  // Algoritmo para calcular as larguras dinâmicas das colunas
  const calculateDynamicColumnWidths = () => {
    const headers = ['Código', 'Descrição', 'Quantidade', 'AF'];
    const buffer = 2; // Espaços extras para legibilidade entre as colunas

    // Inicializa as larguras máximas com o comprimento dos cabeçalhos
    const maxLengths = headers.map(header => header.length);

    displayedItems.forEach(item => {
      const codigo = item.codigo_peca || '';
      const descricao = item.descricao || '';
      const quantidade = item.quantidade !== undefined ? item.quantidade.toString() : '';
      const af = item.af || '';

      maxLengths[0] = Math.max(maxLengths[0], codigo.length);
      maxLengths[1] = Math.max(maxLengths[1], descricao.length);
      maxLengths[2] = Math.max(maxLengths[2], quantidade.length);
      maxLengths[3] = Math.max(maxLengths[3], af.length);
    });

    // Adiciona o buffer a cada largura máxima, exceto para a última coluna
    const widths = maxLengths.map((length, index) => {
      // A última coluna não precisa de buffer *depois* dela, pois é o fim da linha
      return index < maxLengths.length - 1 ? length + buffer : length;
    });
    
    return widths;
  };

  // Função para formatar o texto para a área de transferência (com larguras dinâmicas e espaçamento exato)
  const formatListTextForClipboard = () => {
    if (displayedItems.length === 0) return '';

    const [codigoWidth, descricaoWidth, quantidadeWidth, afWidth] = calculateDynamicColumnWidths();
    const headers = ['Código', 'Descrição', 'Quantidade', 'AF'];

    let formattedText = '';

    // Adiciona a linha do cabeçalho com espaçamento exato
    formattedText +=
      headers[0].padEnd(codigoWidth) +
      headers[1].padEnd(descricaoWidth) +
      headers[2].padEnd(quantidadeWidth) +
      headers[3].padEnd(afWidth) + '\n';

    // Adiciona as linhas de dados com espaçamento exato
    displayedItems.forEach(item => {
      formattedText +=
        String(item.codigo_peca || '').padEnd(codigoWidth) +
        String(item.descricao || '').padEnd(descricaoWidth) +
        String(item.quantidade !== undefined ? item.quantidade.toString() : '').padEnd(quantidadeWidth) +
        String(item.af || '').padEnd(afWidth) + '\n';
    });

    return formattedText.trim();
  };

  // Função para formatar o texto especificamente para o WhatsApp (usando a mesma lógica de espaçamento exato)
  const formatListTextForWhatsApp = () => {
    // Reutiliza a função de formatação para a área de transferência, pois a lógica é a mesma
    return formatListTextForClipboard();
  };

  const handleCopyList = async () => {
    if (displayedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    const textToCopy = formatListTextForClipboard();

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

    const textToShare = formatListTextForWhatsApp();
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Lista de Peças</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={handleCopyList} disabled={displayedItems.length === 0} className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Copiar Lista
          </Button>
          <Button 
            onClick={handleShareOnWhatsApp} 
            disabled={displayedItems.length === 0} 
            variant="ghost" 
            size="icon" 
            aria-label="Compartilhar no WhatsApp" 
          >
            <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-12 w-12" /> {/* Aumentado para h-12 w-12 */}
          </Button>
          <Button onClick={handleExportPdf} disabled={displayedItems.length === 0} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={displayedItems.length === 0} className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Limpar Lista
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
      </CardHeader>
      <CardContent>
        {displayedItems.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item na lista. Adicione peças para começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>AF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.codigo_peca || 'N/A'}</TableCell>
                    <TableCell>{item.descricao || 'N/A'}</TableCell>
                    <TableCell>{item.quantidade ?? 'N/A'}</TableCell>
                    <TableCell className="font-medium">{item.af || ''}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
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