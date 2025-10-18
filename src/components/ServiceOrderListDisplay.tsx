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

interface ServiceOrderListDisplayProps {
  listItems: ListItem[];
  onListChanged: () => void;
}

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ listItems, onListChanged }) => {
  const handleExportPdf = () => {
    if (listItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    generatePartsListPdf(listItems, 'Lista de Ordens de Serviço');
    showSuccess('PDF gerado com sucesso!');
  };

  const handleCopyList = async () => {
    if (listItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    // Agrupar itens por AF e OS
    const groupedByAfOs: { [key: string]: {
      af: string;
      os?: number;
      servico_executado?: string;
      hora_inicio?: string;
      hora_final?: string;
      parts: { quantidade: number; descricao: string; codigo_peca: string }[];
    } } = {};

    listItems.forEach(item => {
      const key = `${item.af}-${item.os || 'no_os'}`;
      if (!groupedByAfOs[key]) {
        groupedByAfOs[key] = {
          af: item.af,
          os: item.os,
          servico_executado: item.servico_executado,
          hora_inicio: item.hora_inicio,
          hora_final: item.hora_final,
          parts: [],
        };
      }
      groupedByAfOs[key].parts.push({
        quantidade: item.quantidade,
        descricao: item.descricao,
        codigo_peca: item.codigo_peca,
      });
    });

    let textToCopy = '';
    for (const key in groupedByAfOs) {
      const group = groupedByAfOs[key];
      
      // Linha 1: AF e OS
      textToCopy += `${group.af}`;
      if (group.os) {
        textToCopy += ` OS:${group.os}`;
      }
      textToCopy += '\n';

      // Linha 2: Serviço Executado
      if (group.servico_executado) {
        textToCopy += `${group.servico_executado}\n`;
      }

      // Linha 3: Hora de Início e Hora Final
      if (group.hora_inicio && group.hora_final) {
        textToCopy += `${group.hora_inicio}-${group.hora_final}\n`;
      } else if (group.hora_inicio) {
        textToCopy += `Início: ${group.hora_inicio}\n`;
      } else if (group.hora_final) {
        textToCopy += `Fim: ${group.hora_final}\n`;
      }

      // Linha 4: Peças
      if (group.parts.length > 0) {
        const partsString = group.parts.map(part =>
          `${part.quantidade}-${part.descricao} ${part.codigo_peca}`
        ).join(', '); // Juntar as peças com vírgula e espaço
        textToCopy += `Peças:${partsString}\n`;
      }
      textToCopy += '\n'; // Adiciona uma linha em branco entre os grupos
    }

    // Remove a última linha em branco extra, se houver
    textToCopy = textToCopy.trim();

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de ordens de serviço copiada para a área de transferência!');
    } catch (err) {
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
      console.error('Failed to copy service order items:', err);
    }
  };

  const handleClearList = async () => {
    try {
      await clearList();
      onListChanged();
      showSuccess('Lista limpa com sucesso!');
    } catch (error) {
      showError('Erro ao limpar a lista.');
      console.error('Failed to clear list:', error);
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
        <CardTitle className="text-2xl font-bold">Lista de Ordens de Serviço</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={handleCopyList} disabled={listItems.length === 0} className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Copiar Lista
          </Button>
          <Button onClick={handleExportPdf} disabled={listItems.length === 0} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={listItems.length === 0} className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Limpar Lista
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover todos os itens da sua lista de ordens de serviço. Esta ação não pode ser desfeita.
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
        {listItems.length === 0 ? (
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
                  <TableHead>OS</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Serviço Executado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.codigo_peca}</TableCell>
                    <TableCell>{item.descricao}</TableCell>
                    <TableCell>{item.quantidade}</TableCell>
                    <TableCell>{item.af}</TableCell>
                    <TableCell>{item.os || 'N/A'}</TableCell>
                    <TableCell>{item.hora_inicio || 'N/A'}</TableCell>
                    <TableCell>{item.hora_final || 'N/A'}</TableCell>
                    <TableCell>{item.servico_executado || 'N/A'}</TableCell>
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

export default ServiceOrderListDisplay;