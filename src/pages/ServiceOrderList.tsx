import React, { useState, useEffect, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay';
import { getListItems, ListItem } from '@/services/partListService';
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
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingServiceOrder, setEditingServiceOrder] = useState<ServiceOrderDetails | null>(null);

  // 1. loadListItems: Apenas responsável por buscar e definir listItems.
  // Não deve depender ou definir editingServiceOrder para evitar loops.
  const loadListItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getListItems();
      setListItems(items);
    } catch (error) {
      showError('Erro ao carregar a lista de ordens de serviço.');
      console.error('Failed to load service order items:', error);
      setListItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [setListItems, setIsLoading, showError]); // Dependências são setters estáveis e uma função utilitária

  // 2. Efeito para chamar loadListItems na montagem e quando o callback loadListItems muda (o que não acontecerá se suas dependências forem estáveis)
  useEffect(() => {
    loadListItems();
  }, [loadListItems]);

  // 3. Efeito para gerenciar editingServiceOrder com base nas mudanças em listItems,
  // mas sem causar um loop com loadListItems.
  useEffect(() => {
    if (listItems.length > 0) {
      const uniqueServiceOrders: { [key: string]: ListItem } = {};
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
        
        // Verifica se a ordem atualmente em edição ainda é válida na nova lista de itens
        const isCurrentEditedOrderStillValid = editingServiceOrder && listItems.some(item =>
          item.af === editingServiceOrder.af &&
          (item.os === editingServiceOrder.os || (item.os === undefined && editingServiceOrder.os === undefined)) &&
          (item.hora_inicio === editingServiceOrder.hora_inicio || (item.hora_inicio === undefined && editingServiceOrder.hora_inicio === undefined)) &&
          (item.hora_final === editingServiceOrder.hora_final || (item.hora_final === undefined && editingServiceOrder.hora_final === undefined)) &&
          (item.servico_executado === editingServiceOrder.servico_executado || (item.servico_executado === undefined && editingServiceOrder.servico_executado === undefined))
        );

        // Se nenhuma ordem estiver sendo editada, ou se a ordem atual em edição não for mais válida,
        // define a ordem mais recente como a que está sendo editada (no modo 'add_part').
        if (!editingServiceOrder || !isCurrentEditedOrderStillValid) {
          setEditingServiceOrder({
            af: latestOrder.af,
            os: latestOrder.os,
            hora_inicio: latestOrder.hora_inicio,
            hora_final: latestOrder.hora_final,
            servico_executado: latestOrder.servico_executado,
            createdAt: latestOrder.created_at,
            mode: 'add_part', // Modo padrão ao selecionar automaticamente
          });
          showSuccess(`Editando Ordem de Serviço AF: ${latestOrder.af}${latestOrder.os ? `, OS: ${latestOrder.os}` : ''}`);
        }
        // Se uma ordem já estiver sendo editada e ainda for válida, não faz nada aqui.
        // Seus detalhes serão atualizados pelo useEffect do formulário, se necessário.
      } else {
        // Se não houver itens na lista, limpa qualquer estado de edição
        setEditingServiceOrder(null);
      }
    } else {
      // Se listItems ficar vazio, limpa editingServiceOrder
      setEditingServiceOrder(null);
    }
  }, [listItems, editingServiceOrder, setEditingServiceOrder, showSuccess, showError]); // Dependências para este efeito

  const handleEditServiceOrder = useCallback((details: ServiceOrderDetails) => {
    setEditingServiceOrder(details);
    if (details.mode === 'edit_details') {
      showSuccess(`Editando detalhes da Ordem de Serviço AF: ${details.af}${details.os ? `, OS: ${details.os}` : ''}`);
    } else {
      showSuccess(`Adicionando peça à Ordem de Serviço AF: ${details.af}${details.os ? `, OS: ${details.os}` : ''}`);
    }
  }, [setEditingServiceOrder, showSuccess]);

  const handleNewServiceOrder = useCallback(() => {
    setEditingServiceOrder(null);
    showSuccess('Iniciando nova Ordem de Serviço.');
  }, [setEditingServiceOrder, showSuccess]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
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
      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400">
        Lista de Ordens de Serviço
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        <ServiceOrderForm 
          onItemAdded={loadListItems} 
          editingServiceOrder={editingServiceOrder}
          onNewServiceOrder={handleNewServiceOrder}
          listItems={listItems}
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