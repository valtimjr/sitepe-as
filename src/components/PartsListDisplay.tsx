import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListItem, clearList, deleteListItem } from '@/services/partListService';
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
  listItems: ListItem[];
  onListChanged: () => void;
}

const PartsListDisplay: React.FC<PartsListDisplayProps> = ({ listItems, onListChanged }) => {
  // Filtra os itens para exibir apenas aqueles que NÃO possuem AF (ou seja, são da lista de peças simples)
  const filteredListItems = listItems.filter(item => item.af === undefined || item.af === null || item.af === '');

  const handleExportPdf = () => {
    if (filteredListItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    generatePartsListPdf(filteredListItems, 'Lista de Peças Simples');
    showSuccess('PDF gerado com sucesso!');
  };

  const handleCopyList = async () => {
    if (filteredListItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    let textToCopy = '';
    filteredListItems.forEach(item => {
      let itemLine = '';
      if (item.quantidade && item.descricao && item.codigo_peca) {
        itemLine = `${item.quantidade}-${item.descricao} ${item.codigo_peca}`;
      } else if (item.descricao) {
        itemLine = item.descricao;
      } else if (item.codigo_peca) {
        itemLine = item.codigo_peca;
      } else {
        itemLine = 'Item sem peça';
      }
      textToCopy += `${itemLine}\n`;
    });

    textToCopy = textToCopy.trim();

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de peças copiada para a área de transferência!');
    } catch (err) {
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
      console.error('Failed to copy list items:', err);
    }
  };

  const handleClearList = async () => {
    try {
      // Para limpar apenas os itens da lista de peças simples, precisamos iterar e deletar individualmente
      // ou adicionar uma função em localDbService para limpar por condição.
      // Por simplicidade, vamos deletar todos os itens sem AF.
      for (const item of filteredListItems) {
        await deleteListItem(item.id);
      }
      onListChanged();
      showSuccess('Lista de peças simples limpa com sucesso!');
    } catch (error) {
      showError('Erro ao limpar a lista de peças simples.');
      console.error('Failed to clear simple parts list:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteListItem(id);
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
          <Button onClick={handleCopyList} disabled={filteredListItems.length === 0} className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Copiar Lista
          </Button>
          <Button onClick={handleExportPdf} disabled={filteredListItems.length === 0} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={filteredListItems.length === 0} className="flex items-center gap-2">
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
        {filteredListItems.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item na lista. Adicione peças para começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.codigo_peca || 'N/A'}</TableCell>
                    <TableCell>{item.descricao || 'N/A'}</TableCell>
                    <TableCell>{item.quantidade ?? 'N/A'}</TableCell>
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