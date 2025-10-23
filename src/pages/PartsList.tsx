import React, { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import PartListItemForm from '@/components/PartListItemForm';
import PartsListDisplay from '@/components/PartsListDisplay';
import { getSimplePartsListItems, SimplePartItem } from '@/services/partListService'; // Usar getSimplePartsListItems e SimplePartItem
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const PartsList = () => {
  const [listItems, setListItems] = useState<SimplePartItem[]>([]); // Agora usa SimplePartItem
  const [isLoading, setIsLoading] = useState(true);
  const [listTitle, setListTitle] = useState('Lista de Peças Simples'); // Novo estado para o título

  useEffect(() => {
    document.title = "Minha Lista de Peças - AutoBoard";
  }, []);

  const loadListItems = async () => {
    setIsLoading(true);
    try {
      const items = await getSimplePartsListItems(); // Chama a nova função
      setListItems(items);
    } catch (error) {
      showError('Erro ao carregar a lista de peças.');
      console.error('Failed to load simple parts list items:', error);
      setListItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListItems();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary">
        Minha Lista de Peças
      </h1>
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando sua lista de peças...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          <PartListItemForm onItemAdded={loadListItems} />
          <PartsListDisplay 
            listItems={listItems} 
            onListChanged={loadListItems} 
            listTitle={listTitle} // Passando o título
            onTitleChange={setListTitle} // Passando a função de atualização
          />
        </div>
      )}
      <MadeWithDyad />
    </div>
  );
};

export default PartsList;