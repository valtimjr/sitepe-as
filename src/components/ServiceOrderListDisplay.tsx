import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ServiceOrderItem, clearServiceOrderList, deleteServiceOrderItem, addServiceOrderItem } from '@/services/partListService';
import { generateServiceOrderPdf } from '@/lib/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, Download, Copy, PlusCircle, MoreVertical, Pencil, Clock } from 'lucide-react';
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
  createdAt?: Date;
  mode: 'add_part' | 'edit_details';
}

interface ServiceOrderListDisplayProps {
  listItems: ServiceOrderItem[];
  onListChanged: () => void;
  isLoading: boolean;
  onEditServiceOrder: (details: ServiceOrderDetails) => void;
  editingServiceOrder: ServiceOrderDetails | null;
}

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ listItems, onListChanged, isLoading, onEditServiceOrder, editingServiceOrder }) => {
  const handleExportPdf = () => {
    if (listItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    generateServiceOrderPdf(listItems, 'Lista de Ordens de Serviço');
    showSuccess('PDF gerado com sucesso!');
  };

  const formatServiceOrderTextForClipboard = () => {
    if (listItems.length === 0) return '';

    const groupedByAfOs: { [key: string]: {
      af: string;
      os?: number;
      servico_executado?: string;
      hora_inicio?: string;
      hora_final?: string;
      parts: { id: string; quantidade?: number; descricao?: string; codigo_peca?: string }[];
    } } = {};

    listItems.forEach(item => {
      const key = `${item.af}-${item.os || 'no_os'}-${item.servico_executado || 'no_service'}-${item.hora_inicio || 'no_start'}-${item.hora_final || 'no_end'}`;
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
      if (item.codigo_peca || item.descricao) {
        groupedByAfOs[key].parts.push({
          id: item.id,
          quantidade: item.quantidade,
          descricao: item.descricao,
          codigo_peca: item.codigo_peca,
        });
      }
    });

    let textToCopy = '';
    for (const key in groupedByAfOs) {
      const group = groupedByAfOs[key];
      
      // AF and OS line
      textToCopy += `AF: ${group.af}`;
      if (group.os) {
        textToCopy += ` OS: ${group.os}`;
      }
      textToCopy += '\n';

      // Service Executado
      if (group.servico_executado) {
        textToCopy += `${group.servico_executado}\n`;
      }

      // Horário
      if (group.hora_inicio && group.hora_final) {
        textToCopy += `${group.hora_inicio}-${group.hora_final}\n`;
      } else if (group.hora_inicio) {
        textToCopy += `${group.hora_inicio}\n`;
      } else if (group.hora_final) {
        textToCopy += `${group.hora_final}\n`;
      }

      // Parts list
      if (group.parts.length > 0) {
        textToCopy += 'Peças:\n';
        group.parts.forEach(part => {
          let partString = '';
          const quantity = part.quantidade ?? 1; // Default to 1 if quantity is undefined
          partString += `${quantity} - `;

          if (part.descricao) {
            partString += `${part.descricao} `;
          }
          if (part.codigo_peca) {
            partString += `Cód: ${part.codigo_peca}`;
          }
          textToCopy += `${partString.trim()}\n`;
        });
      }
      textToCopy += '\n';
    }

    return textToCopy.trim();
  };

  const handleCopyList = async () => {
    if (listItems.length === 0) {
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
    if (listItems.length === 0) {
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
      await clearServiceOrderList(); // Chama a nova função
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
        mode: editingServiceOrder?.mode || 'add_part',
      };

      const originalCreatedAt = itemToDelete.created_at;

      await deleteServiceOrderItem(id); // Chama a nova função
      showSuccess('Item removido da lista.');

      const remainingItemsForThisSO = listItems.filter(item =>
        item.id !== id &&
        item.af === currentSOIdentifier.af &&
        (item.os === currentSOIdentifier.os || (item.os === undefined && currentSOIdentifier.os === undefined)) &&
        (item.hora_inicio === currentSOIdentifier.hora_inicio || (item.hora_inicio === undefined && currentSOIdentifier.hora_inicio === undefined)) &&
        (item.hora_final === currentSOIdentifier.hora_final || (item.hora_final === undefined && currentSOIdentifier.hora_final === undefined)) &&
        (item.servico_executado === currentSOIdentifier.servico_executado || (item.servico_executado === undefined && currentSOIdentifier.servico_executado === undefined))
      );

      const hasRealPartsRemaining = remainingItemsForThisSO.some(item => item.codigo_peca || item.descricao || (item.quantidade !== undefined && item.quantidade > 0));

      if (!hasRealPartsRemaining) {
        const blankItemExists = remainingItemsForThisSO.some(item =>
          !item.codigo_peca && !item.descricao && (item.quantidade === undefined || item.quantidade === 0)
        );

        if (!blankItemExists) {
          await addServiceOrderItem({ // Chama a nova função
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

  const handleDeleteServiceOrder = async (group: { af: string; os?: number; hora_inicio?: string; hora_final?: string; servico_executado?: string }) => {
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
        await localDb.serviceOrderItems.bulkDelete(idsToDelete); // Usa a tabela correta
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

  const groupedForDisplay: { [key: string]: {
    af: string;
    os?: number;
    servico_executado?: string;
    hora_inicio?: string;
    hora_final?: string;
    createdAt: Date;
    parts: { id: string; quantidade?: number; descricao?: string; codigo_peca?: string }[];
  } } = {};

  listItems.forEach(item => {
    const key = `${item.af}-${item.os || 'no_os'}-${item.servico_executado || 'no_service'}-${item.hora_inicio || 'no_start'}-${item.hora_final || 'no_end'}`;
    if (!groupedForDisplay[key]) {
      groupedForDisplay[key] = {
        af: item.af,
        os: item.os,
        servico_executado: item.servico_executado,
        hora_inicio: item.hora_inicio,
        hora_final: item.hora_final,
        createdAt: item.created_at || new Date(),
        parts: [],
      };
    } else {
      if (item.created_at && groupedForDisplay[key].createdAt && item.created_at < groupedForDisplay[key].createdAt) {
        groupedForDisplay[key].createdAt = item.created_at;
      }
    }
    groupedForDisplay[key].parts.push({
      id: item.id,
      quantidade: item.quantidade,
      descricao: item.descricao,
      codigo_peca: item.codigo_peca,
    });
  });

  const sortedGroups = Object.values(groupedForDisplay).sort((a, b) => {
    // 1. Ordenar por hora_inicio (se presente)
    const timeA = a.hora_inicio || '';
    const timeB = b.hora_inicio || '';

    if (timeA && timeB) {
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
    } else if (timeA && !timeB) {
      return -1; // A com hora_inicio vem antes de B sem
    } else if (!timeA && timeB) {
      return 1; // B com hora_inicio vem antes de A sem
    }

    // 2. Ordenar por hora_final (se presente)
    const timeEndA = a.hora_final || '';
    const timeEndB = b.hora_final || '';

    if (timeEndA && timeEndB) {
      if (timeEndA < timeEndB) return -1;
      if (timeEndA > timeEndB) return 1;
    } else if (timeEndA && !timeEndB) {
      return -1; // A com hora_final vem antes de B sem
    } else if (!timeEndA && timeEndB) {
      return 1; // B com hora_final vem antes de A sem
    }

    // 3. Fallback para created_at
    if (!a.createdAt || !b.createdAt) return 0;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Lista de Ordens de Serviço</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap justify-end gap-2 p-4 pt-0">
          <Button onClick={handleCopyList} disabled={listItems.length === 0 || isLoading} className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> Copiar Lista
          </Button>
          <Button 
            onClick={handleShareOnWhatsApp} 
            disabled={listItems.length === 0 || isLoading} 
            variant="ghost" 
            className="h-10 w-10 p-0 rounded-full" 
            aria-label="Compartilhar no WhatsApp" 
          >
            <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-10 w-10" />
          </Button>
          <Button onClick={handleExportPdf} disabled={listItems.length === 0 || isLoading} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={listItems.length === 0 || isLoading} className="flex items-center gap-2">
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
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando sua lista de ordens de serviço...</p>
        ) : listItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item na lista. Adicione itens antes de começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Removendo cabeçalhos redundantes */}
                  <TableHead className="w-fit">Opções</TableHead>
                  <TableHead className="w-auto whitespace-normal break-words">Peça</TableHead>
                  <TableHead className="w-[4rem]">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGroups.map((group, groupIndex) => {
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
                    <React.Fragment key={`${group.af}-${group.os || 'no_os'}-${groupIndex}`}>
                      {/* Linha de Detalhes da OS (Agrupamento) */}
                      <TableRow className="border-t-4 border-primary dark:border-primary bg-muted/50 hover:bg-muted/80">
                        <TableCell colSpan={3} className="font-semibold py-2">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-primary">AF: {group.af}</span>
                                {group.os && <span className="text-lg font-bold text-primary">(OS: {group.os})</span>}
                              </div>
                              <DropdownMenu>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="mr-2">
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
                        </TableCell>
                      </TableRow>

                      {/* Linhas de Peças */}
                      {group.parts.filter(p => p.codigo_peca || p.descricao).map((part, partIndex) => (
                        <TableRow key={part.id} className={isEditingThisServiceOrder ? 'bg-accent/10' : ''}>
                          {/* Célula de Opções (vazia para alinhamento) */}
                          <TableCell className="w-fit"></TableCell>
                          
                          <TableCell className="w-auto whitespace-normal break-words flex justify-between items-center">
                            <span className="text-sm">
                              {part.codigo_peca && part.descricao 
                                ? `${part.codigo_peca} - ${part.descricao}` 
                                : part.codigo_peca || part.descricao || 'Item sem descrição'}
                            </span>
                            {isEditingThisServiceOrder && editingServiceOrder?.mode === 'edit_details' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(part.id)} className="ml-2">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remover item</TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell className="w-[4rem]">{part.quantidade ?? ''}</TableCell>
                        </TableRow>
                      ))}
                      {/* Se não houver peças, mas houver um item em branco (para manter a OS), exibe uma linha de aviso */}
                      {group.parts.filter(p => p.codigo_peca || p.descricao).length === 0 && (
                        <TableRow className="text-muted-foreground italic">
                          <TableCell colSpan={3} className="text-center">
                            Nenhuma peça adicionada a esta OS.
                          </TableCell>
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