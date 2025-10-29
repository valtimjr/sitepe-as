import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ServiceOrderItem, clearServiceOrderList, deleteServiceOrderItem, addServiceOrderItem } from '@/services/partListService';
import { generateServiceOrderPdf } from '@/lib/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, Download, Copy, PlusCircle, MoreVertical, Pencil, Clock, GripVertical, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localDb } from '@/services/localDbService';

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  createdAt: Date; // createdAt é obrigatório para agrupar
  mode: 'add_part' | 'edit_details';
}

interface ServiceOrderGroup {
  id: string; // ID único para o grupo (usado para drag-and-drop)
  af: string;
  os?: number;
  servico_executado?: string;
  hora_inicio?: string;
  hora_final?: string;
  createdAt: Date;
  parts: { id: string; quantidade?: number; descricao?: string; codigo_peca?: string }[];
}

type SortOrder = 'manual' | 'asc' | 'desc';

interface ServiceOrderListDisplayProps {
  listItems: ServiceOrderItem[];
  onListChanged: () => void;
  isLoading: boolean;
  onEditServiceOrder: (details: ServiceOrderDetails) => void;
  editingServiceOrder: ServiceOrderDetails | null;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
}

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ listItems, onListChanged, isLoading, onEditServiceOrder, editingServiceOrder, sortOrder, onSortOrderChange }) => {
  const [groupedServiceOrders, setGroupedServiceOrders] = useState<ServiceOrderGroup[]>([]);
  const [draggedGroup, setDraggedGroup] = useState<ServiceOrderGroup | null>(null);

  // Função auxiliar para comparar strings de tempo
  const compareTimeStrings = (t1: string | undefined, t2: string | undefined): number => {
    const time1 = t1 || '';
    const time2 = t2 || '';
    const d1 = time1.length > 0;
    const d2 = time2.length > 0;

    if (d1 && !d2) return -1;
    if (!d1 && d2) return 1;
    
    if (time1 < time2) return -1;
    if (time1 > time2) return 1;
    return 0;
  };

  // Função para agrupar e ordenar os itens brutos
  const processListItems = useCallback((items: ServiceOrderItem[], currentSortOrder: SortOrder): ServiceOrderGroup[] => {
    const grouped: { [key: string]: ServiceOrderGroup } = {};

    items.forEach(item => {
      // Usar created_at para garantir unicidade do grupo se outros campos forem iguais
      const groupKey = `${item.af}-${item.os || 'no_os'}-${item.hora_inicio || 'no_start'}-${item.hora_final || 'no_end'}-${item.servico_executado || 'no_service'}-${item.created_at?.getTime() || 'no_created_at'}`;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          id: groupKey, // Usar a chave como ID para drag-and-drop
          af: item.af,
          os: item.os,
          servico_executado: item.servico_executado,
          hora_inicio: item.hora_inicio,
          hora_final: item.hora_final,
          createdAt: item.created_at || new Date(),
          parts: [],
        };
      }
      // Adiciona apenas itens que representam peças reais (com código ou descrição)
      if (item.codigo_peca || item.descricao) {
        grouped[groupKey].parts.push({
          id: item.id,
          quantidade: item.quantidade,
          descricao: item.descricao,
          codigo_peca: item.codigo_peca,
        });
      }
    });

    let result = Object.values(grouped);

    if (currentSortOrder === 'asc') {
      result.sort((a, b) => {
        const startComparison = compareTimeStrings(a.hora_inicio, b.hora_inicio);
        if (startComparison !== 0) return startComparison;
        const endComparison = compareTimeStrings(a.hora_final, b.hora_final);
        if (endComparison !== 0) return endComparison;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    } else if (currentSortOrder === 'desc') {
      result.sort((a, b) => {
        const startComparison = compareTimeStrings(b.hora_inicio, a.hora_inicio);
        if (startComparison !== 0) return startComparison;
        const endComparison = compareTimeStrings(b.hora_final, a.hora_final);
        if (endComparison !== 0) return endComparison;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } else {
      // 'manual' - a ordem é mantida pelo estado `groupedServiceOrders`
      // Se `listItems` mudou, mas a ordem é manual, tentamos preservar a ordem existente
      if (groupedServiceOrders.length > 0) {
        const existingOrderMap = new Map(groupedServiceOrders.map((group, index) => [group.id, index]));
        result.sort((a, b) => {
          const indexA = existingOrderMap.has(a.id) ? existingOrderMap.get(a.id)! : Infinity;
          const indexB = existingOrderMap.has(b.id) ? existingOrderMap.get(b.id)! : Infinity;
          return indexA - indexB;
        });
      } else {
        // Se não há ordem manual prévia, ordena por data de criação (mais antigo primeiro)
        result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    }

    return result;
  }, [groupedServiceOrders]); // Depende de groupedServiceOrders para a ordenação manual

  // Efeito para processar os itens da lista e aplicar a ordenação
  useEffect(() => {
    setGroupedServiceOrders(processListItems(listItems, sortOrder));
  }, [listItems, sortOrder, processListItems]);

  const formatServiceOrderTextForClipboard = useCallback(() => {
    if (groupedServiceOrders.length === 0) return '';

    let textToCopy = '';
    
    groupedServiceOrders.forEach(group => {
      textToCopy += `AF: ${group.af}`;
      if (group.os) {
        textToCopy += ` OS: ${group.os}`;
      }
      textToCopy += '\n';

      if (group.servico_executado) {
        textToCopy += `${group.servico_executado}\n`;
      }

      if (group.hora_inicio && group.hora_final) {
        textToCopy += `${group.hora_inicio}-${group.hora_final}\n`;
      } else if (group.hora_inicio) {
        textToCopy += `${group.hora_inicio}\n`;
      } else if (group.hora_final) {
        textToCopy += `${group.hora_final}\n`;
      }

      if (group.parts.length > 0) {
        textToCopy += 'Peças:\n';
        group.parts.forEach(part => {
          if (part.codigo_peca || part.descricao) {
            let partString = '';
            const quantity = part.quantidade ?? 1;
            partString += `${quantity} - `;

            if (part.descricao) {
              partString += `${part.descricao} `;
            }
            if (part.codigo_peca) {
              partString += `Cód: ${part.codigo_peca}`;
            }
            textToCopy += `${partString.trim()}\n`;
          }
        });
      }
      textToCopy += '\n';
    });

    return textToCopy.trim();
  }, [groupedServiceOrders]);

  const handleExportPdf = () => {
    if (groupedServiceOrders.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    // Passa os itens brutos, mas a função de PDF já agrupa e ordena internamente
    generateServiceOrderPdf(listItems, 'Lista de Ordens de Serviço');
    showSuccess('PDF gerado com sucesso!');
  };

  const handleCopyList = async () => {
    if (groupedServiceOrders.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    const textToCopy = formatServiceOrderTextForClipboard();

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de ordens de serviço copiada para a área de transferência!');
    } catch (err) {
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
      console.error('Failed to copy service order items:', err);
    }
  };

  const handleShareOnWhatsApp = () => {
    if (groupedServiceOrders.length === 0) {
      showError('A lista está vazia. Adicione itens antes de compartilhar.');
      return;
    }

    const textToShare = formatServiceOrderTextForClipboard();
    const encodedText = encodeURIComponent(textToShare);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
    showSuccess('Lista de ordens de serviço pronta para compartilhar no WhatsApp!');
  };

  const handleClearList = async () => {
    try {
      await clearServiceOrderList();
      onListChanged();
      showSuccess('Lista limpa com sucesso!');
    } catch (error) {
      showError('Erro ao limpar a lista.');
      console.error('Failed to clear service order list:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const itemToDelete = listItems.find(item => item.id === id);
      if (!itemToDelete) {
        showError('Item não encontrado para exclusão.');
        return;
      }

      const currentSOIdentifier: ServiceOrderDetails = {
        af: itemToDelete.af,
        os: itemToDelete.os,
        hora_inicio: itemToDelete.hora_inicio,
        hora_final: itemToDelete.hora_final,
        servico_executado: itemToDelete.servico_executado,
        createdAt: itemToDelete.created_at || new Date(),
        mode: editingServiceOrder?.mode || 'add_part',
      };

      const originalCreatedAt = itemToDelete.created_at;

      await deleteServiceOrderItem(id);
      showSuccess('Item removido da lista.');

      const remainingItemsForThisSO = listItems.filter(item =>
        item.id !== id &&
        item.af === currentSOIdentifier.af &&
        (item.os === currentSOIdentifier.os || (item.os === undefined && currentSOIdentifier.os === undefined)) &&
        (item.hora_inicio === currentSOIdentifier.hora_inicio || (currentSOIdentifier.hora_inicio === undefined && item.hora_inicio === undefined)) &&
        (item.hora_final === currentSOIdentifier.hora_final || (currentSOIdentifier.hora_final === undefined && item.hora_final === undefined)) &&
        (item.servico_executado === currentSOIdentifier.servico_executado || (currentSOIdentifier.servico_executado === undefined && item.servico_executado === undefined))
      );

      const hasRealPartsRemaining = remainingItemsForThisSO.some(item => item.codigo_peca || item.descricao || (item.quantidade !== undefined && item.quantidade > 0));

      if (!hasRealPartsRemaining) {
        const blankItemExists = remainingItemsForThisSO.some(item =>
          !item.codigo_peca && !item.descricao && (item.quantidade === undefined || item.quantidade === 0)
        );

        if (!blankItemExists) {
          await addServiceOrderItem({
            af: currentSOIdentifier.af,
            os: currentSOIdentifier.os,
            hora_inicio: currentSOIdentifier.hora_inicio,
            hora_final: currentSOIdentifier.hora_final,
            servico_executado: currentSOIdentifier.servico_executado,
            codigo_peca: undefined,
            descricao: undefined,
            quantidade: undefined,
          }, originalCreatedAt);
          showSuccess('Ordem de Serviço agora está sem peças, mas mantida para edição.');
        }
      }

      onEditServiceOrder({ ...currentSOIdentifier, createdAt: originalCreatedAt });
      onListChanged();

    } catch (error) {
      showError('Erro ao remover item da lista.');
      console.error('Failed to delete item:', error);
    }
  };

  const handleDeleteServiceOrder = async (group: ServiceOrderGroup) => {
    try {
      const itemsToDelete = listItems.filter(item =>
        item.af === group.af &&
        (item.os === group.os || (item.os === undefined && group.os === undefined)) &&
        (item.hora_inicio === group.hora_inicio || (item.hora_inicio === undefined && group.hora_inicio === undefined)) &&
        (item.hora_final === group.hora_final || (item.hora_final === undefined && group.hora_final === undefined)) &&
        (item.servico_executado === group.servico_executado || (item.servico_executado === undefined && group.servico_executado === undefined))
      );

      if (itemsToDelete.length > 0) {
        const idsToDelete = itemsToDelete.map(item => item.id);
        await localDb.serviceOrderItems.bulkDelete(idsToDelete);
        showSuccess(`Ordem de Serviço AF: ${group.af}${group.os ? `, OS: ${group.os}` : ''} e seus itens foram excluídos.`);
        onListChanged();
      } else {
        showError('Nenhum item encontrado para esta Ordem de Serviço.');
      }
    } catch (error) {
      showError('Erro ao excluir a Ordem de Serviço.');
      console.error('Failed to delete service order:', error);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, group: ServiceOrderGroup) => {
    // Sempre permite arrastar
    setDraggedGroup(group);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', group.id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-t-2', 'border-primary');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-primary');
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetGroup: ServiceOrderGroup) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-t-2', 'border-primary');

    if (draggedGroup && draggedGroup.id !== targetGroup.id) { // Removida a condição `sortOrder === 'manual'`
      const newOrderedGroups = [...groupedServiceOrders];
      const draggedIndex = newOrderedGroups.findIndex(group => group.id === draggedGroup.id);
      const targetIndex = newOrderedGroups.findIndex(group => group.id === targetGroup.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newOrderedGroups.splice(draggedIndex, 1);
        newOrderedGroups.splice(targetIndex, 0, removed);
        setGroupedServiceOrders(newOrderedGroups);
        onSortOrderChange('manual'); // Define a ordem como manual após o drag-and-drop
        showSuccess('Ordem manual aplicada. As setas de ordenação foram removidas.');
      }
    }
    setDraggedGroup(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedGroup(null);
  };
  // --- End Drag and Drop Handlers ---

  const handleTimeSortClick = () => {
    if (sortOrder === 'asc') {
      onSortOrderChange('desc');
    } else if (sortOrder === 'desc') {
      onSortOrderChange('manual'); // Volta para manual
    } else { // Se for manual, vai para asc
      onSortOrderChange('asc');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Lista de Ordens de Serviço</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap justify-end gap-2 p-4 pt-0">
          <Button 
            onClick={handleCopyList} 
            disabled={groupedServiceOrders.length === 0 || isLoading} 
            size="icon"
            className="sm:w-auto sm:px-4"
          >
            <Copy className="h-4 w-4" /> 
            <span className="hidden sm:inline ml-2">Copiar Lista</span>
          </Button>
          <Button 
            onClick={handleShareOnWhatsApp} 
            disabled={groupedServiceOrders.length === 0 || isLoading} 
            variant="ghost" 
            className="h-10 w-10 p-0 rounded-full" 
            aria-label="Compartilhar no WhatsApp" 
          >
            <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-10 w-10" />
          </Button>
          <Button onClick={handleExportPdf} disabled={groupedServiceOrders.length === 0 || isLoading} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={groupedServiceOrders.length === 0 || isLoading} 
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
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando sua lista de ordens de serviço...</p>
        ) : groupedServiceOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item na lista. Adicione itens antes de começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] p-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" /> {/* Drag handle header */}
                  </TableHead>
                  {/* Coluna Peça (ocupa a maior parte do espaço) */}
                  <TableHead className="w-auto whitespace-normal break-words p-2">Peça</TableHead>
                  {/* Coluna Qtd com largura fixa */}
                  <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                  {/* Coluna Hora com botão de ordenação */}
                  <TableHead className="w-[120px] p-2 text-left"> {/* Alinhado à esquerda para o ícone */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleTimeSortClick} 
                      className="flex items-center justify-start gap-1 w-full" // Alinhado à esquerda
                    >
                      <Clock className="h-4 w-4" /> Hora
                      {sortOrder === 'asc' && <ArrowDownNarrowWide className="h-4 w-4 ml-1" />}
                      {sortOrder === 'desc' && <ArrowUpNarrowWide className="h-4 w-4 ml-1" />}
                    </Button>
                  </TableHead>
                  {/* Coluna Opções (alinhada à direita) */}
                  <TableHead className="w-[40px] p-2 text-right">Opções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedServiceOrders.map((group, groupIndex) => {
                  const isEditingThisServiceOrder = editingServiceOrder &&
                    editingServiceOrder.af === group.af &&
                    (editingServiceOrder.os === group.os || (editingServiceOrder.os === undefined && group.os === undefined)) &&
                    (editingServiceOrder.hora_inicio === group.hora_inicio || (editingServiceOrder.hora_inicio === undefined && group.hora_inicio === undefined)) &&
                    (editingServiceOrder.hora_final === group.hora_final || (editingServiceOrder.hora_final === undefined && group.hora_final === undefined)) &&
                    (editingServiceOrder.servico_executado === group.servico_executado || (editingServiceOrder.servico_executado === undefined && group.servico_executado === undefined));

                  const timeDisplay = (group.hora_inicio || group.hora_final) 
                    ? (group.hora_inicio || '??') + ' - ' + (group.hora_final || '??')
                    : '';

                  return (
                    <React.Fragment key={group.id}>
                      {/* Linha de Detalhes da OS (Agrupamento) */}
                      <TableRow 
                        className="border-t-4 border-primary dark:border-primary bg-muted/50 hover:bg-muted/80"
                        draggable={true} // Sempre draggable
                        onDragStart={(e) => handleDragStart(e, group)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, group)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        data-id={group.id}
                      >
                        <TableCell className="w-[40px] p-2 cursor-grab">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        {/* Célula única que abrange as colunas de Peça e Qtd */}
                        <TableCell colSpan={2} className="font-semibold py-2 align-top">
                          <div className="flex justify-between items-start">
                            {/* Detalhes da OS (Lado Esquerdo) */}
                            <div className="flex flex-col space-y-1 flex-grow">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-primary">AF: {group.af}</span>
                                {group.os && <span className="text-lg font-bold text-primary">(OS: {group.os})</span>}
                              </div>
                              {timeDisplay && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {timeDisplay}
                                </span>
                              )}
                              {group.servico_executado && (
                                <p className="text-sm text-foreground/70 whitespace-normal break-words pt-1">
                                  Serviço: {group.servico_executado}
                                </p>
                              )}
                            </div>
                            
                            {/* DropdownMenu (Lado Direito, alinhado com a coluna Opções) */}
                            <DropdownMenu>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Opções da Ordem de Serviço</TooltipContent>
                              </Tooltip>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditServiceOrder({ 
                                  af: group.af, 
                                  os: group.os, 
                                  hora_inicio: group.hora_inicio, 
                                  hora_final: group.hora_final, 
                                  servico_executado: group.servico_executado,
                                  createdAt: group.createdAt,
                                  mode: 'add_part'
                                })}>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Peça
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEditServiceOrder({ 
                                  af: group.af, 
                                  os: group.os, 
                                  hora_inicio: group.hora_inicio, 
                                  hora_final: group.hora_final, 
                                  servico_executado: group.servico_executado,
                                  createdAt: group.createdAt,
                                  mode: 'edit_details'
                                })}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar Detalhes da OS
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Excluir Ordem de Serviço
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação irá remover TODOS os itens da Ordem de Serviço AF: {group.af}{group.os ? `, OS: ${group.os}` : ''}. Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteServiceOrder(group)}>Excluir OS</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Linhas de Peças */}
                      {group.parts.map((part, partIndex) => (
                        <TableRow key={part.id} className={isEditingThisServiceOrder ? 'bg-accent/10' : ''}>
                          <TableCell className="w-[40px] p-2"></TableCell> {/* Célula vazia para alinhar com o drag handle */}
                          <TableCell className="w-auto whitespace-normal break-words p-2">
                            <span className="text-sm">
                              {part.codigo_peca && part.descricao 
                                ? `${part.codigo_peca} - ${part.descricao}` 
                                : part.codigo_peca || part.descricao || 'Item sem descrição'}
                            </span>
                          </TableCell>
                          <TableCell className="w-[4rem] p-2">{part.quantidade ?? ''}</TableCell>
                          
                          {/* Célula de Hora (vazia para itens de peça) */}
                          <TableCell className="w-[120px] p-2"></TableCell>

                          {/* Célula de Ações para a Peça (alinhada com a coluna Opções) */}
                          <TableCell className="w-[40px] p-2 text-right">
                            {isEditingThisServiceOrder && editingServiceOrder?.mode === 'edit_details' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(part.id)} className="h-8 w-8">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remover item</TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Se não houver peças, mas houver um item em branco (para manter a OS), exibe uma linha de aviso */}
                      {group.parts.filter(p => p.codigo_peca || p.descricao).length === 0 && (
                        <TableRow className="text-muted-foreground italic">
                          <TableCell className="w-[40px] p-2"></TableCell> {/* Célula vazia para alinhar */}
                          <TableCell colSpan={2} className="text-center p-2">
                            Nenhuma peça adicionada a esta OS.
                          </TableCell>
                          <TableCell className="w-[120px] p-2"></TableCell> {/* Célula vazia para alinhar com Hora */}
                          <TableCell className="w-[40px] p-2"></TableCell> {/* Célula vazia para alinhar com Opções */}
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceOrderListDisplay;