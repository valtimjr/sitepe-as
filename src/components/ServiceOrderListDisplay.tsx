import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ServiceOrderItem, clearServiceOrderList, deleteServiceOrderItem, addServiceOrderItem } from '@/services/partListService';
import { generateServiceOrderPdf } from '@/lib/pdfGenerator';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Trash2, Download, Copy, PlusCircle, MoreVertical, Pencil, Clock, GripVertical, ArrowUpNarrowWide, ArrowDownNarrowWide, XCircle, Save, FilePlus } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile'; // Importar o hook useIsMobile
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // Importar Sheet
import ServiceOrderForm from './ServiceOrderForm'; // Importar o formulário
import { cn } from '@/lib/utils'; // Importar cn

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  createdAt?: Date; // createdAt é opcional aqui, mas será obrigatório no ServiceOrderGroupDetails
}

interface ServiceOrderGroupDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  createdAt: Date; // createdAt é obrigatório para agrupar
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

type FormMode = 'create-new-so' | 'add-part-to-existing-so' | 'edit-part' | 'edit-so-details';

type SortOrder = 'manual' | 'asc' | 'desc';

interface ServiceOrderListDisplayProps {
  listItems: ServiceOrderItem[];
  onListChanged: () => void;
  isLoading: boolean;
  onEditServiceOrder: (details: ServiceOrderDetails & { mode: FormMode }) => void; // Atualizado para incluir 'mode'
  editingServiceOrder: ServiceOrderDetails | null;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
}

const timeToEffectiveMinutes = (timeString: string | undefined): number | null => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  let totalMinutes = hours * 60 + minutes;
  // Se o horário for entre 00:00 (inclusive) e 07:00 (exclusive),
  // adiciona 24 horas (1440 minutos) para que seja ordenado efetivamente no "dia seguinte".
  // Isso faz com que os turnos noturnos que cruzam a meia-noite sejam ordenados corretamente após os turnos da noite.
  if (hours >= 0 && hours < 7) { // Horários de 00:00 a 06:59
    totalMinutes += 24 * 60;
  }
  return totalMinutes;
};

const compareTimeStrings = (t1: string | undefined, t2: string | undefined): number => {
  const effectiveMinutes1 = timeToEffectiveMinutes(t1);
  const effectiveMinutes2 = timeToEffectiveMinutes(t2);

  // Lida com horários indefinidos/nulos: indefinido vem por último
  if (effectiveMinutes1 === null && effectiveMinutes2 === null) return 0;
  if (effectiveMinutes1 === null) return 1; // t1 é indefinido, então é "depois"
  if (effectiveMinutes2 === null) return -1; // t2 é indefinido, então é "depois"

  return effectiveMinutes1 - effectiveMinutes2;
};

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ listItems, onListChanged, isLoading, onEditServiceOrder, editingServiceOrder, sortOrder, onSortOrderChange }) => {
  const [groupedServiceOrders, setGroupedServiceOrders] = useState<ServiceOrderGroup[]>([]);
  const [draggedGroup, setDraggedGroup] = useState<ServiceOrderGroup | null>(null);

  const isMobile = useIsMobile(); // Hook para detectar mobile

  // Estados para o formulário de adição/edição de peças (via Sheet/Dialog)
  const [isPartFormOpen, setIsPartFormOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<ServiceOrderItem | null>(null);
  const [soGroupForPartForm, setSoGroupForPartForm] = useState<ServiceOrderGroupDetails | null>(null); // Usar ServiceOrderGroupDetails
  const [partFormMode, setPartFormMode] = useState<'add-part-to-existing-so' | 'edit-part'>('add-part-to-existing-so');

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
    } else { // 'manual' or initial load, default to createdAt ascending
      result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return result;
  }, []); // Dependencies: none, as it's a pure function of its arguments.

  // Efeito para processar os itens da lista e aplicar a ordenação
  useEffect(() => {
    const newGroupedOrders = processListItems(listItems, sortOrder);

    if (sortOrder === 'manual') {
      // When in manual mode, and listItems change, we need to merge new/updated groups
      // into the existing manual order, preserving the manual order of existing groups.
      const existingGroupMap = new Map(groupedServiceOrders.map(g => [g.id, g]));
      const newGroupMap = new Map(newGroupedOrders.map(g => [g.id, g]));

      const updatedAndExistingInOrder: ServiceOrderGroup[] = [];
      const newGroupsToAdd: ServiceOrderGroup[] = [];

      // Iterate through the current manual order to update existing groups and collect new ones
      groupedServiceOrders.forEach(existingGroup => {
        if (newGroupMap.has(existingGroup.id)) {
          // If the group still exists, use its updated content from newGroupMap
          updatedAndExistingInOrder.push(newGroupMap.get(existingGroup.id)!);
        }
        // If it doesn't exist in newGroupMap, it was deleted, so we don't add it.
      });

      // Add any entirely new groups (not present in the old groupedServiceOrders)
      newGroupedOrders.forEach(newGroup => {
        if (!existingGroupMap.has(newGroup.id)) {
          newGroupsToAdd.push(newGroup);
        }
      });

      // Combine, new groups are added at the end.
      setGroupedServiceOrders([...updatedAndExistingInOrder, ...newGroupsToAdd]);

    } else {
      // If not manual, just apply the sorted list directly
      setGroupedServiceOrders(newGroupedOrders);
    }
  }, [listItems, sortOrder, processListItems]); // Dependencies: listItems, sortOrder, processListItems

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
    // Passa os itens JÁ AGRUPADOS E ORDENADOS para a função de PDF
    generateServiceOrderPdf(groupedServiceOrders, 'Lista de Ordens de Serviço');
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
      };

      const originalCreatedAt = itemToDelete.created_at;

      await deleteServiceOrderItem(id);
      showSuccess('Item removido da lista.');

      const remainingItemsForThisSO = listItems.filter(item =>
        item.id !== id &&
        item.af === currentSOIdentifier.af &&
        (item.os === currentSOIdentifier.os || (item.os === undefined && currentSOIdentifier.os === undefined)) &&
        (item.hora_inicio === currentSOIdentifier.hora_inicio || (item.hora_inicio === undefined && currentSOIdentifier.hora_inicio === undefined)) &&
        (item.hora_final === currentSOIdentifier.hora_final || (currentSOIdentifier.hora_final === undefined && item.hora_final === undefined)) &&
        (item.servico_executado === currentSOIdentifier.servico_executado || (item.servico_executado === undefined && currentSOIdentifier.servico_executado === undefined))
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

      onEditServiceOrder({ ...currentSOIdentifier, mode: 'add-part-to-existing-so' }); // Passa o modo correto
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
    // Drag-and-drop sempre ativo
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
    e.currentTarget.classList.remove('opacity-50');

    if (draggedGroup && draggedGroup.id !== targetGroup.id) {
      const newOrderedGroups = [...groupedServiceOrders];
      const draggedIndex = newOrderedGroups.findIndex(group => group.id === draggedGroup.id);
      const targetIndex = newOrderedGroups.findIndex(group => group.id === targetGroup.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newOrderedGroups.splice(draggedIndex, 1);
        newOrderedGroups.splice(targetIndex, 0, removed);
        setGroupedServiceOrders(newOrderedGroups);
        onSortOrderChange('manual'); // Define a ordem como manual após o drag-and-drop
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

  // --- Funções para o formulário de peças (inline/sheet) ---
  const handleOpenAddPartForm = (group: ServiceOrderGroup) => {
    setSoGroupForPartForm({
      af: group.af,
      os: group.os,
      hora_inicio: group.hora_inicio,
      hora_final: group.hora_final,
      servico_executado: group.servico_executado,
      createdAt: group.createdAt,
    });
    setPartToEdit(null); // Garante que é modo de adição
    setPartFormMode('add-part-to-existing-so');
    setIsPartFormOpen(true);
  };

  const handleOpenEditPartForm = (part: ServiceOrderItem, group: ServiceOrderGroup) => {
    setPartToEdit(part);
    setSoGroupForPartForm({
      af: group.af,
      os: group.os,
      hora_inicio: group.hora_inicio,
      hora_final: group.hora_final,
      servico_executado: group.servico_executado,
      createdAt: group.createdAt,
    }); // Passa o grupo para o formulário saber a qual OS a peça pertence
    setPartFormMode('edit-part');
    setIsPartFormOpen(true);
  };

  const handlePartFormClose = () => {
    setIsPartFormOpen(false);
    setPartToEdit(null);
    setSoGroupForPartForm(null);
    onListChanged(); // Recarrega a lista após salvar/cancelar
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <CardTitle className="text-2xl font-bold mb-2 sm:mb-0">Lista de Ordens de Serviço</CardTitle>
          {/* REMOVIDO: Botão "Iniciar Nova Ordem de Serviço" para mobile */}
        </div>
      </CardHeader>
      <div className="flex flex-wrap justify-end gap-2 p-4 pt-0">
          {/* Botão "Iniciar Nova Ordem de Serviço" para desktop e mobile, visível apenas se houver ordens */}
          {groupedServiceOrders.length > 0 && (
            <Button 
              onClick={() => onEditServiceOrder({ af: '', createdAt: new Date(), mode: 'create-new-so' })} 
              className="flex items-center gap-2 mr-auto" // mr-auto para empurrar para a esquerda
            >
              <FilePlus className="h-4 w-4" /> Iniciar Nova OS
            </Button>
          )}
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FilePlus className="h-16 w-16 mb-4 text-primary" />
            <p className="text-lg mb-4">Nenhuma ordem de serviço adicionada ainda.</p>
            {/* MANTIDO: O botão "Iniciar a Primeira Ordem de Serviço" */}
            <Button 
              onClick={() => onEditServiceOrder({ af: '', createdAt: new Date(), mode: 'create-new-so' })}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" /> Iniciar a Primeira Ordem de Serviço
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px] px-1 py-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" /> {/* Drag handle header */}
                  </TableHead>
                  {/* Coluna Hora com botão de ordenação (movida para a esquerda) */}
                  <TableHead className="w-[50px] px-1 py-2 text-center"> {/* Alinhado ao centro */}
                    <Button 
                      variant="ghost" 
                      size="icon" // Alterado para size="icon"
                      onClick={handleTimeSortClick} 
                      className="flex items-center justify-center w-full" // Centralizado
                    >
                      <Clock className="h-4 w-4" />
                      {sortOrder === 'asc' && <ArrowDownNarrowWide className="h-4 w-4 ml-1" />}
                      {sortOrder === 'desc' && <ArrowUpNarrowWide className="h-4 w-4 ml-1" />}
                    </Button>
                  </TableHead>
                  {/* Coluna Peça (ocupa a maior parte do espaço) */}
                  <TableHead className="w-auto whitespace-normal break-words px-1 py-2">Peça</TableHead>
                  {/* Coluna Qtd com largura fixa */}
                  <TableHead className="w-[3rem] px-1 py-2 text-center">Qtd</TableHead> {/* Alinhado ao centro */}
                  {/* Coluna Opções (alinhada à direita) */}
                  <TableHead className="w-[70px] px-1 py-2 text-right">Opções</TableHead>
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
                      ><TableCell className="w-[30px] px-1 py-2 cursor-grab">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        {/* Célula única que abrange as colunas do botão de ordenação, Peça e Qtd */}
                        <TableCell colSpan={4} className="font-semibold py-2 align-top"> {/* colSpan ajustado para 4 */}
                          <div className="flex justify-between items-start">
                            {/* Detalhes da OS (Lado Esquerdo) */}
                            <div className="flex flex-col space-y-1 flex-grow">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-primary">AF: {group.af}</span>
                                {group.os && <span className="text-lg font-bold text-primary"> (OS: {group.os})</span>}
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
                            
                            {/* Botões de Ação (Lado Direito, alinhado com a coluna Opções) */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => onEditServiceOrder({ 
                                      af: group.af, 
                                      os: group.os, 
                                      hora_inicio: group.hora_inicio, 
                                      hora_final: group.hora_final, 
                                      servico_executado: group.servico_executado,
                                      createdAt: group.createdAt,
                                      mode: 'edit-so-details'
                                    })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar Detalhes da OS</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir Ordem de Serviço</TooltipContent>
                                </Tooltip>
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
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Linhas de Peças */}
                      {group.parts.map((part, partIndex) => (
                        <TableRow key={part.id} className={isEditingThisServiceOrder ? 'bg-accent/10' : ''}>
                          <TableCell className="w-[30px] px-1 py-2"></TableCell> {/* Célula vazia para alinhar com o drag handle */}
                          <TableCell className="w-[50px] px-1 py-2"></TableCell> {/* Célula vazia para alinhar com o botão de ordenação */}
                          <TableCell className="w-auto whitespace-normal break-words px-1 py-2">
                            <span className="text-sm">
                              {part.codigo_peca && part.descricao 
                                ? `${part.codigo_peca} - ${part.descricao}` 
                                : part.codigo_peca || part.descricao || 'Item sem descrição'}
                            </span>
                          </TableCell>
                          <TableCell className="w-[3rem] px-1 py-2 text-center">{part.quantidade ?? ''}</TableCell> {/* Alinhado ao centro */}
                          
                          {/* Célula de Ações para a Peça (alinhada com a coluna Opções) */}
                          <TableCell className="w-[70px] px-1 py-2 text-right">
                            <div className="flex justify-end items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditPartForm(part as ServiceOrderItem, group)} className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar item</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Remover item</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação irá remover o item "{part.codigo_peca || part.descricao}" da lista. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem(part.id)}>Remover</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Botão "Adicionar Peça" abaixo da última peça (ou se não houver peças) */}
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenAddPartForm(group)}
                            className="flex items-center gap-2 mx-auto"
                          >
                            <PlusCircle className="h-4 w-4" /> Adicionar Peça
                          </Button>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {/* Botão "Adicionar Ordem de Serviço" no final da lista - REMOVIDO */}
      {/*
      {!isLoading && groupedServiceOrders.length > 0 && (
        <div className="mt-8 text-center">
          <Button 
            onClick={() => onEditServiceOrder({ af: '', createdAt: new Date(), mode: 'create-new-so' })} // Inicia uma nova OS
            className="flex items-center gap-2 mx-auto"
          >
            <FilePlus className="h-4 w-4" /> Iniciar Nova Ordem de Serviço
          </Button>
        </div>
      )}
      */}

      {/* Sheet/Dialog para Adicionar/Editar Peça */}
      {isPartFormOpen && (
        <Sheet open={isPartFormOpen} onOpenChange={setIsPartFormOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {partFormMode === 'add-part-to-existing-so' ? 'Adicionar Peça' : 'Editar Peça'} à OS {soGroupForPartForm?.af}
                {soGroupForPartForm?.os && ` (OS: ${soGroupForPartForm.os})`}
              </SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <ServiceOrderForm
                mode={partFormMode}
                onItemAdded={handlePartFormClose}
                onClose={handlePartFormClose}
                initialPartData={partToEdit} // Passa a peça a ser editada
                initialSoData={soGroupForPartForm} // Passa os detalhes da OS para a qual a peça pertence
                onNewServiceOrder={() => {}} // Não é relevante neste contexto
                listItems={listItems} // Passa listItems para o formulário
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </Card>
  );
};

export default ServiceOrderListDisplay;