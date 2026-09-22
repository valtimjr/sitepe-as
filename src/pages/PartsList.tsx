import React, { useState, useEffect, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import PartItemForm from '@/components/PartItemForm';
import PartsListDisplay from '@/components/PartsListDisplay';
import { SimplePartItem } from '@/services/partListService';
import { 
  getListsData, 
  setActiveListId, 
  createList, 
  renameList, 
  duplicateList, 
  deleteList, 
  reorderLists, 
  LocalList 
} from '@/services/localListStorage';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Calendar, Clock, Package } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCompany } from '@/context/CompanyContext';
import { ListCarousel } from '@/components/ListCarousel';

const PartsList = () => {
  const { company, branding } = useCompany();
  const [lists, setLists] = useState<LocalList[]>([]);
  const [activeListId, setActiveListIdState] = useState<string>('');
  const [activeList, setActiveList] = useState<LocalList | null>(null);
  const [listItems, setListItems] = useState<SimplePartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listTitle, setListTitle] = useState('Lista de Peças Simples');
  
  // Estados para o formulário de edição em mobile
  const [editingItem, setEditingItem] = useState<SimplePartItem | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = `Minha Lista de Peças - AutoBoard (${branding.name})`;
  }, [branding.name]);

  const loadListsAndItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getListsData(company);
      setLists(data.lists);
      setActiveListIdState(data.activeListId);
      
      const active = data.lists.find(l => l.id === data.activeListId) || data.lists[0];
      if (active) {
        setActiveList(active);
        setListItems(active.items || []);
        setListTitle(active.name);
      }
    } catch (error) {
      showError('Erro ao carregar as listas de peças.');
    } finally {
      setIsLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadListsAndItems();
  }, [loadListsAndItems]);

  useEffect(() => {
    const handlePartAdded = () => {
      loadListsAndItems();
    };
    window.addEventListener('part-added-to-list', handlePartAdded);
    return () => {
      window.removeEventListener('part-added-to-list', handlePartAdded);
    };
  }, [loadListsAndItems]);

  const handleSelectList = async (id: string) => {
    await setActiveListId(company, id);
    await loadListsAndItems();
  };

  const handleCreateList = async (name: string) => {
    const newList = await createList(company, name);
    await setActiveListId(company, newList.id);
    await loadListsAndItems();
    showSuccess(`Lista "${newList.name}" criada com sucesso!`);
  };

  const handleRenameList = async (id: string, newName: string) => {
    await renameList(company, id, newName);
    await loadListsAndItems();
    showSuccess('Lista renomeada com sucesso!');
  };

  const handleDuplicateList = async (id: string) => {
    await duplicateList(company, id);
    await loadListsAndItems();
    showSuccess('Lista duplicada com sucesso!');
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteList(company, id);
      await loadListsAndItems();
      showSuccess('Lista excluída com sucesso!');
    } catch (error: any) {
      showError(error.message || 'Erro ao excluir lista.');
    }
  };

  const handleReorderLists = async (orderedIds: string[]) => {
    await reorderLists(company, orderedIds);
    await loadListsAndItems();
  };

  const handleTitleChange = async (newTitle: string) => {
    setListTitle(newTitle);
    if (activeListId) {
      await renameList(company, activeListId, newTitle);
      // Atualiza apenas o estado local das listas para evitar re-renderização pesada
      const data = await getListsData(company);
      setLists(data.lists);
    }
  };

  const handleListReordered = (reorderedItems: SimplePartItem[]) => {
    setListItems(reorderedItems);
    // Salva a nova ordem dos itens na lista ativa
    if (activeList) {
      const updatedList = { ...activeList, items: reorderedItems };
      setActiveList(updatedList);
      // Atualiza no localStorage
      const updatedLists = lists.map(l => l.id === activeList.id ? updatedList : l);
      const data = { activeListId, lists: updatedLists };
      localStorage.setItem(`autoboard_lists_v2_${company}`, JSON.stringify(data));
    }
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
    loadListsAndItems();
  }, [loadListsAndItems]);

  const formatLastUpdated = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
                    
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
      return `Hoje às ${timeStr}`;
    }
    
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${dateStr} às ${timeStr}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <h1 className="text-4xl font-extrabold mb-6 mt-8 text-center text-primary dark:text-primary flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <img src="/icons/tela_inicial/8.png" alt="" className="h-16 w-auto object-contain" />
          Minha Lista de Peças
        </div>
        <span className="text-2xl font-bold opacity-80">{branding.name}</span>
      </h1>

      {/* List Carousel */}
      {!isLoading && (
        <ListCarousel
          lists={lists}
          activeListId={activeListId}
          company={company}
          companyName={branding.name}
          onSelectList={handleSelectList}
          onCreateList={handleCreateList}
          onRenameList={handleRenameList}
          onDuplicateList={handleDuplicateList}
          onDeleteList={handleDeleteList}
          onReorderLists={handleReorderLists}
        />
      )}

      {/* Active List Header Info */}
      {activeList && (
        <div className="w-full max-w-6xl mx-auto mb-6 px-4 py-3 bg-card border border-border/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Lista: {activeList.name}</h2>
              <p className="text-xs text-muted-foreground">
                {listItems.length} {listItems.length === 1 ? 'peça cadastrada' : 'peças cadastradas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4 text-primary/70" />
            <span>Última alteração: {formatLastUpdated(activeList.updatedAt)}</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando sua lista de peças...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
          {/* O formulário de adição permanece no lado esquerdo */}
          <PartItemForm onItemAdded={loadListsAndItems} /> 
          <PartsListDisplay 
            listItems={listItems} 
            onListChanged={loadListsAndItems} 
            onListReordered={handleListReordered}
            listTitle={listTitle} 
            onTitleChange={handleTitleChange} 
            onOpenEditForm={handleOpenEditForm}
          />
        </div>
      )}
      
      <div className="flex justify-center mt-8 mb-8">
        <Link to={`/${company}`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>

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
                onItemAdded={handleCloseEditForm}
                onCloseEdit={handleCloseEditForm}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default PartsList;