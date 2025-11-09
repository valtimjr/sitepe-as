import React, { useState, useEffect, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import { getServiceOrderItems, ServiceOrderItem } from '@/services/partListService'; // Usar getServiceOrderItems e ServiceOrderItem
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FilePlus, ClipboardList, Clock, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // Importar Sheet
// Dialog não será mais usado para o formulário principal
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'; 
import { useIsMobile } from '@/hooks/use-mobile'; // Importar useIsMobile

type FormMode = 'create-new-so' | 'add-part-to-existing-so' | 'edit-part' | 'edit-so-details';

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  createdAt?: Date; // createdAt é opcional aqui, mas será obrigatório no ServiceOrderGroupDetails
  mode?: FormMode;
}

type SortOrder = 'manual' | 'asc' | 'desc';

interface ServiceOrderListProps {
  onItemAdded: () => void;
  onNewServiceOrder: () => void;
  listItems: ServiceOrderItem[]; // Ainda necessário para a lógica de item em branco
  onClose?: () => void; // Para fechar o Sheet/Dialog
  
  mode: FormMode; // Modo explícito do formulário
  initialSoData?: ServiceOrderDetails | null; // Dados da OS (para criar nova, editar detalhes, adicionar peça)
  initialPartData?: ServiceOrderItem | null; // Dados da peça (apenas para editar peça)
}

const ServiceOrderList: React.FC = () => {
  const [listItems, setListItems] = useState<ServiceOrderItem[]>([]); // Agora usa ServiceOrderItem
  const [isLoading, setIsLoading] = useState(true);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ServiceOrderDetails | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc'); // Alterado para 'asc' como padrão
  const [isFormOpen, setIsFormOpen] = useState(false); // Novo estado para controlar a abertura do formulário principal

  const isMobile = useIsMobile(); // Hook para detectar mobile

  useEffect(() => {
    document.title = "Ordens de Serviço - AutoBoard";
  }, []);

  const loadListItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getServiceOrderItems(); // Chama a nova função
      setListItems(items);
    } catch (error) {
      showError('Erro ao carregar a lista de ordens de serviço.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListItems();
  }, [loadListItems]);

  // Efeito para definir a OS mais recente para edição ao carregar a lista
  useEffect(() => {
    if (!isLoading && listItems.length > 0 && !isFormOpen) {
      const uniqueServiceOrders: { [key: string]: ServiceOrderItem } = {};
      listItems.forEach(item => {
        const key = `${item.af}-${item.os || 'no_os'}-${item.servico_executado || 'no_service'}-${item.hora_inicio || 'no_start'}-${item.hora_final || 'no_end'}-${item.created_at?.getTime() || 'no_created_at'}`;
        if (!uniqueServiceOrders[key] || (item.created_at && uniqueServiceOrders[key].created_at && item.created_at > uniqueServiceOrders[key].created_at!)) {
          uniqueServiceOrders[key] = item;
        }
      });

      const sortedUniqueOrders = Object.values(uniqueServiceOrders).sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return b.created_at.getTime() - a.created_at.getTime(); // Mais recente primeiro
      });

      if (sortedUniqueOrders.length > 0) {
        const latestOrder = sortedUniqueOrders[0];
        
        // Verifica se a OS mais recente já está sendo editada ou se o formulário está aberto para uma nova OS
        const isCurrentEditedOrderStillValid = editingServiceOrder && listItems.some(item =>
          item.af === editingServiceOrder.af &&
          (item.os === editingServiceOrder.os || (item.os === undefined && editingServiceOrder.os === undefined)) &&
          (item.hora_inicio === editingServiceOrder.hora_inicio || (editingServiceOrder.hora_inicio === undefined && item.hora_inicio === undefined)) &&
          (item.hora_final === editingServiceOrder.hora_final || (editingServiceOrder.hora_final === undefined && item.hora_final === undefined)) &&
          (item.servico_executado === editingServiceOrder.servico_executado || (editingServiceOrder.servico_executado === undefined && item.servico_executado === undefined))
        );

        if (!isCurrentEditedOrderStillValid) {
          setEditingServiceOrder({
            af: latestOrder.af,
            os: latestOrder.os,
            hora_inicio: latestOrder.hora_inicio,
            hora_final: latestOrder.hora_final,
            servico_executado: latestOrder.servico_executado,
            createdAt: latestOrder.created_at,
          });
          // showSuccess(`Editando Ordem de Serviço AF: ${latestOrder.af}${latestOrder.os ? `, OS: ${latestOrder.os}` : ''}`);
        }
      } else {
        setEditingServiceOrder(null);
      }
    }
  }, [listItems, isLoading, isFormOpen, editingServiceOrder]);


  const handleEditServiceOrder = useCallback((details: ServiceOrderDetails) => {
    setEditingServiceOrder(details);
    setIsFormOpen(true); // Abre o formulário
    // showSuccess messages are now handled by the form itself
  }, [setEditingServiceOrder, setIsFormOpen]);

  const handleNewServiceOrder = useCallback(() => {
    setEditingServiceOrder(null); // Garante que é uma nova OS
    setIsFormOpen(true); // Abre o formulário
    handleEditServiceOrder({ af: '', createdAt: new Date(), mode: 'create-new-so' });
  }, [handleEditServiceOrder, setIsFormOpen]);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingServiceOrder(null); // Limpa o item de edição ao fechar
    loadListItems(); // Recarrega a lista para garantir que a OS mais recente seja selecionada
  }, [setIsFormOpen, setEditingServiceOrder, loadListItems]);

  const handleSortChange = useCallback((order: SortOrder) => {
    setSortOrder(order);
  }, []);

  // Usar Sheet para ambos mobile e desktop
  const ModalComponent = Sheet;
  const ModalContentComponent = SheetContent;
  const ModalHeaderComponent = SheetHeader;
  const ModalTitleComponent = SheetTitle;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-4 mt-8 text-center text-primary dark:text-primary flex items-center justify-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        Lista de Ordens de Serviço
      </h1>
      
      {/* REMOVIDO: Botão "Iniciar Nova Ordem de Serviço" para mobile */}
      {/*
      {isMobile && (
        <Button 
          onClick={() => onEditServiceOrder({ af: '', createdAt: new Date(), mode: 'create-new-so' })} 
          className="flex items-center gap-2 w-full sm:w-auto mb-4 sm:mb-0"
        >
          <FilePlus className="h-4 w-4" /> Iniciar Nova OS
        </Button>
      )}
      */}

      {/* O formulário principal agora é um modal/sheet */}
      <ModalComponent open={isFormOpen} onOpenChange={setIsFormOpen}>
        <ModalContentComponent 
          side="right" // Sempre da direita para a esquerda
          className={isMobile ? "w-full sm:max-w-lg overflow-y-auto" : "sm:max-w-lg md:max-w-xl overflow-y-auto"} // Ajuste de largura para desktop
        >
          <ModalHeaderComponent>
            <ModalTitleComponent>
              {editingServiceOrder?.mode === 'edit-so-details' ? 'Editar Detalhes da Ordem de Serviço' :
               editingServiceOrder?.mode === 'add-part-to-existing-so' ? 'Adicionar Peça à Ordem de Serviço' :
               'Criar Nova Ordem de Serviço'}
            </ModalTitleComponent>
          </ModalHeaderComponent>
          <div className="py-4">
            <ServiceOrderForm 
              onItemAdded={handleFormClose} 
              onNewServiceOrder={handleNewServiceOrder} // Passa para o formulário poder iniciar uma nova OS
              listItems={listItems}
              mode={editingServiceOrder?.mode || 'create-new-so'} // Garante um modo padrão
              initialSoData={editingServiceOrder} // Passa o objeto ServiceOrderDetails completo
              initialPartData={null} // Não há peça inicial para este formulário principal
              onClose={handleFormClose}
            />
          </div>
        </ModalContentComponent>
      </ModalComponent>

      {/* ServiceOrderListDisplay - Agora é um filho direto do container principal */}
      <ServiceOrderListDisplay 
        listItems={listItems} 
        onListChanged={loadListItems} 
        onEditServiceOrder={handleEditServiceOrder}
        editingServiceOrder={editingServiceOrder}
        isLoading={isLoading} 
        sortOrder={sortOrder}
        onSortOrderChange={handleSortChange}
      />
      <MadeWithDyad />
    </div>
  );
};

export default ServiceOrderList;