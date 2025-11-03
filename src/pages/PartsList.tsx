import React, { useState, useEffect, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import PartItemForm from '@/components/PartItemForm'; // Renomeado de PartListItemForm
import PartsListDisplay from '@/components/PartsListDisplay';
import { getSimplePartsListItems, SimplePartItem } from '@/services/partListService';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, List } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // Importar Sheet
import { useIsMobile } from '@/hooks/use-mobile'; // Importar o hook useIsMobile

const PartsList = () => {
  const [listItems, setListItems] = useState<SimplePartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listTitle, setListTitle] = useState('Lista de Peças Simples');
  
  // Estados para o formulário de edição em mobile
  const [editingItem, setEditingItem] = useState<SimplePartItem | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const isMobile = useIsMobile(); // Usar o hook useIsMobile

  useEffect(() => {
    document.title = "Minha Lista de Peças - AutoBoard";
  }, []);

  const loadListItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getSimplePartsListItems();
      setListItems(items);
    } catch (error) {
      showError('Erro ao carregar a lista de peças.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListItems();
  }, [loadListItems]);

  const handleListReordered = (reorderedItems: SimplePartItem[]) => {
    setListItems(reorderedItems);
    // A ordem é apenas visual e para exportação/cópia imediata.
  };

  // Função para abrir o formulário de edição com um item específico
  const handleOpenEditForm = useCallback((item: SimplePartItem) => {
    setEditingItem(item);
    setIsEditFormOpen(true);
  }, []);

  // Função para fechar o formulário de edição
  const handleCloseEditForm = useCallback(() => {
    setEditingItem(null);
    setIsEditFormOpen(false);
    loadListItems(); // Recarrega a lista para refletir as alterações
  }, [loadListItems]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <List className="h-8 w-8 text-primary" />
        Minha Lista de Peças
      </h1>
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando sua lista de peças...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          {/* O formulário de adição permanece no lado esquerdo */}
          <PartItemForm onItemAdded={loadListItems} /> 
          <PartsListDisplay 
            listItems={listItems} 
            onListChanged={loadListItems} 
            onListReordered={handleListReordered}
            listTitle={listTitle} 
            onTitleChange={setListTitle} 
            onOpenEditForm={handleOpenEditForm} // Passa a função para abrir o formulário de edição
          />
        </div>
      )}
      <MadeWithDyad />

      {/* Sheet para o formulário de edição em mobile */}
      {isMobile && (
        <Sheet open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <PartItemForm 
                editingItem={editingItem} 
                onItemAdded={handleCloseEditForm} // Chama handleCloseEditForm após adicionar/editar
                onCloseEdit={handleCloseEditForm} // Permite fechar o formulário
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default PartsList;