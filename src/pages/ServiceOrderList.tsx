import React, { useState, useEffect, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import { getServiceOrderItems, ServiceOrderItem } from '@/services/partListService'; // Usar getServiceOrderItems e ServiceOrderItem
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FilePlus } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  createdAt?: Date;
  mode: 'add_part' | 'edit_details';
}

const ServiceOrderList = () => {
  const [listItems, setListItems] = useState<ServiceOrderItem[]>([]); // Agora usa ServiceOrderItem
  const [isLoading, setIsLoading] = useState(true);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ServiceOrderDetails | null>(null);
  const [isCreatingNewOrder, setIsCreatingNewOrder] = useState(false);

  const loadListItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getServiceOrderItems(); // Chama a nova função
      setListItems(items);
    } catch (error) {
      showError('Erro ao carregar a lista de ordens de serviço.');
      console.error('Failed to load service order items:', error);
      setListItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [setListItems, setIsLoading, showError]);

  useEffect(() => {
    loadListItems();
  }, [loadListItems]);

  useEffect(() => {
    if (listItems.length > 0) {
      const uniqueServiceOrders: { [key: string]: ServiceOrderItem } = {};
      listItems.forEach(item => {
        const key = `${item.af}-${item.os || 'no_os'}-${item.servico_executado || 'no_service'}-${item.hora_inicio || 'no_start'}-${item.hora_final || 'no_end'}`;
        if (!uniqueServiceOrders[key] || (item.created_at && uniqueServiceOrders[key].created_at && item.created_at > uniqueServiceOrders[key].created_at!)) {
          uniqueServiceOrders[key] = item;
        }
      });

      const sortedUniqueOrders = Object.values(uniqueServiceOrders).sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return b.created_at.getTime() - a.created_at.getTime();
      });

      if (sortedUniqueOrders.length > 0) {
        const latestOrder = sortedUniqueOrders[0];
        
        const isCurrentEditedOrderStillValid = editingServiceOrder && listItems.some(item =>
          item.af === editingServiceOrder.af &&
          (item.os === editingServiceOrder.os || (item.os === undefined && editingServiceOrder.os === undefined)) &&
          (item.hora_inicio === editingServiceOrder.hora_inicio || (editingServiceOrder.hora_inicio === undefined && item.hora_inicio === undefined)) &&
          (item.hora_final === editingServiceOrder.hora_final || (editingServiceOrder.hora_final === undefined && item.hora_final === undefined)) &&
          (item.servico_executado === editingServiceOrder.servico_executado || (editingServiceOrder.servico_executado === undefined && item.servico_executado === undefined))
        );

        if (!isCreatingNewOrder && (!editingServiceOrder || !isCurrentEditedOrderStillValid)) {
          setEditingServiceOrder({
            af: latestOrder.af,
            os: latestOrder.os,
            hora_inicio: latestOrder.hora_inicio,
            hora_final: latestOrder.hora_final,
            servico_executado: latestOrder.servico_executado,
            createdAt: latestOrder.created_at,
            mode: 'add_part',
          });
          showSuccess(`Editando Ordem de Serviço AF: ${latestOrder.af}${latestOrder.os ? `, OS: ${latestOrder.os}` : ''}`);
        }
      } else {
        setEditingServiceOrder(null);
      }
    } else {
      setEditingServiceOrder(null);
    }
  }, [listItems, editingServiceOrder, setEditingServiceOrder, showSuccess, showError, isCreatingNewOrder]);

  const handleEditServiceOrder = useCallback((details: ServiceOrderDetails) => {
    setIsCreatingNewOrder(false);
    setEditingServiceOrder(details);
    if (details.mode === 'edit_details') {
      showSuccess(`Editando detalhes da Ordem de Serviço AF: ${details.af}${details.os ? `, OS: ${details.os}` : ''}`);
    } else {
      showSuccess(`Adicionando peça à Ordem de Serviço AF: ${details.af}${details.os ? `, OS: ${details.os}` : ''}`);
    }
  }, [setEditingServiceOrder, showSuccess, setIsCreatingNewOrder]);

  const handleNewServiceOrder = useCallback(() => {
    console.log("handleNewServiceOrder called: Setting editingServiceOrder to null and isCreatingNewOrder to true");
    setEditingServiceOrder(null);
    setIsCreatingNewOrder(true);
    showSuccess('Iniciando nova Ordem de Serviço.');
  }, [setEditingServiceOrder, showSuccess, setIsCreatingNewOrder]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
        <Button onClick={handleNewServiceOrder} className="flex items-center gap-2">
          <FilePlus className="h-4 w-4" /> Iniciar Nova Ordem de Serviço
        </Button>
      </div>
      <img src="/icons/whatsapp.png" alt="Logo do Aplicativo" className="h-20 w-20 mb-6 mx-auto" />
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary">
        Lista de Ordens de Serviço
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        <ServiceOrderForm 
          onItemAdded={loadListItems} 
          editingServiceOrder={editingServiceOrder}
          onNewServiceOrder={handleNewServiceOrder}
          listItems={listItems}
          setIsCreatingNewOrder={setIsCreatingNewOrder}
        />
        <ServiceOrderListDisplay 
          listItems={listItems} 
          onListChanged={loadListItems} 
          isLoading={isLoading} 
          onEditServiceOrder={handleEditServiceOrder}
          editingServiceOrder={editingServiceOrder}
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ServiceOrderList;