import React, { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import ServiceOrderForm from '@/components/ServiceOrderForm';
import ServiceOrderListDisplay from '@/components/ServiceOrderListDisplay'; // Importar o novo componente de exibição
import { getListItems, ListItem } from '@/services/partListService';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const ServiceOrderList = () => {
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadListItems = async () => {
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
  };

  useEffect(() => {
    loadListItems();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      <div className="w-full max-w-6xl flex justify-start mb-4">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400">
        Lista de Ordens de Serviço
      </h1>
      {isLoading ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Carregando sua lista de ordens de serviço...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <ServiceOrderForm onItemAdded={loadListItems} />
          <ServiceOrderListDisplay listItems={listItems} onListChanged={loadListItems} /> {/* Usando o novo componente */}
        </div>
      )}
      <MadeWithDyad />
    </div>
  );
};

export default ServiceOrderList;