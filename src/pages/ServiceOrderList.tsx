import React, { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import { getListItems, ListItem } from '@/services/partListService';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FilePlus } from 'lucide-react'; // Importar FilePlus
import { showSuccess, showError } from '@/utils/toast';

interface ServiceOrderDetails {
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
}

const ServiceOrderList = () => {
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ServiceOrderDetails | null>(null);

  const loadListItems = async () => {
    setIsLoading(true);
    try {
      const items = await getListItems();
      setListItems(items);

      // Lógica para identificar a OS mais recente e defini-la como editingServiceOrder
      if (items.length > 0) {
        // Agrupar itens por AF, OS, serviço, horas para identificar ordens de serviço únicas
        const uniqueServiceOrders: { [key: string]: ListItem } = {};
        items.forEach(item => {
          const key = `${item.af}-${item.os || 'no_os'}-${item.servico_executado || 'no_service'}-${item.hora_inicio || 'no_start'}-${item.hora_final || 'no_end'}`;
          if (!uniqueServiceOrders[key] || (item.created_at && uniqueServiceOrders[key].created_at && item.created_at > uniqueServiceOrders[key].created_at!)) {
            uniqueServiceOrders[key] = item;
          }
        });

        const sortedUniqueOrders = Object.values(uniqueServiceOrders).sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0; // Lidar com created_at opcional
          return b.created_at.getTime() - a.created_at.getTime();
        });

        if (sortedUniqueOrders.length > 0) {
          const latestOrder = sortedUniqueOrders[0];
          // Apenas define editingServiceOrder se não houver uma OS já selecionada para edição
          if (!editingServiceOrder) {
            setEditingServiceOrder({
              af: latestOrder.af,
              os: latestOrder.os,
              hora_inicio: latestOrder.hora_inicio,
              hora_final: latestOrder.hora_final,
              servico_executado: latestOrder.servico_executado,
            });
            showSuccess(`Editando Ordem de Serviço AF: ${latestOrder.af}${latestOrder.os ? `, OS: ${latestOrder.os}` : ''}`);
          }
        } else {
          setEditingServiceOrder(null); // Se não houver ordens únicas, não há OS para editar
        }
      } else {
        setEditingServiceOrder(null); // Se não houver itens, não há OS para editar
      }

    } catch (error) {
      showError('Erro ao carregar a lista de ordens de serviço.');
      console.error('Failed to load service order items:', error);
      setListItems([]);
      setEditingServiceOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListItems();
  }, []);

  const handleEditServiceOrder = (details: ServiceOrderDetails) => {
    setEditingServiceOrder(details);
    showSuccess(`Editando Ordem de Serviço AF: ${details.af}${details.os ? `, OS: ${details.os}` : ''}`);
  };

  const handleNewServiceOrder = () => {
    setEditingServiceOrder(null); // Limpa o estado de edição
    showSuccess('Iniciando nova Ordem de Serviço.');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4"> {/* Ajustado para justify-between */}
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
        <Button onClick={handleNewServiceOrder} className="flex items-center gap-2">
          <FilePlus className="h-4 w-4" /> Iniciar Nova Ordem de Serviço
        </Button>
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400">
        Lista de Ordens de Serviço
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        <ServiceOrderForm 
          onItemAdded={loadListItems} 
          editingServiceOrder={editingServiceOrder}
          onNewServiceOrder={handleNewServiceOrder}
          listItems={listItems} // Pass listItems here
        />
        <ServiceOrderListDisplay 
          listItems={listItems} 
          onListChanged={loadListItems} 
          isLoading={isLoading} 
          onEditServiceOrder={handleEditServiceOrder}
          editingServiceOrder={editingServiceOrder} // Passando o estado para o display
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ServiceOrderList;