import React, { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import PartListItemForm from '@/components/PartListItemForm';
import PartsListDisplay from '@/components/PartsListDisplay';
import { getListItems, ListItem } from '@/services/partListService';

const Index = () => {
  const [listItems, setListItems] = useState<ListItem[]>([]);

  const loadListItems = () => {
    setListItems(getListItems());
  };

  useEffect(() => {
    loadListItems();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400">
        Lista de Peças
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        <PartListItemForm onItemAdded={loadListItems} />
        <PartsListDisplay listItems={listItems} onListChanged={loadListItems} />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;