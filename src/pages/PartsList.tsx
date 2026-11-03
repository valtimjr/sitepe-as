import React, { Suspense, lazy, useState, useEffect, useCallback, useRef } from 'react';
import { useAppRefresh } from '@/hooks/useAppRefresh';
import { SimplePartItem } from '@/services/partListService';
import {
  getListsData,
  setActiveListId,
  createList,
  renameList,
  duplicateList,
  deleteList,
  reorderLists,
  replaceListItems,
  LocalList,
} from '@/services/localListStorage';
import { showSuccess, showError } from '@/utils/toast';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';
import type { ListIcon as ListIconData } from '@/types/listIcon';

// Celular e computador em pedaços separados: cada um baixa só o seu código
const PartsListMobile = lazy(() => import('@/components/parts-list/PartsListMobile'));
const PartsListDesktop = lazy(() => import('@/components/parts-list/PartsListDesktop'));

const SAVE_DELAY_MS = 400;

const PartsList = () => {
  const { company, branding } = useCompany();
  const isCompact = useIsCompact();
  const [lists, setLists] = useState<LocalList[]>([]);
  const [activeList, setActiveList] = useState<LocalList | null>(null);
  const [listItems, setListItems] = useState<SimplePartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listTitle, setListTitle] = useState('Lista de Peças Simples');

  // Gravação pendente (quantidade com espera de 400 ms)
  const pendingRef = useRef<{ listId: string; items: SimplePartItem[] } | null>(null);
  const timerRef = useRef<number>();

  const flushPending = useCallback(async () => {
    window.clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) await replaceListItems(company, pending.listId, pending.items);
  }, [company]);

  useEffect(() => {
    document.title = `Minha Lista de Peças - AutoBoard (${branding.name})`;
  }, [branding.name]);

  // Só a primeira carga mostra "carregando"; recargas não desmontam a tela nem os modais abertos
  const loadListsAndItems = useCallback(async () => {
    try {
      await flushPending();
      const data = await getListsData(company);
      setLists(data.lists);
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
  }, [company, flushPending]);

  useEffect(() => {
    loadListsAndItems();
  }, [loadListsAndItems]);

  // Grava o que ficou pendente ao sair da página
  useEffect(() => {
    const onHide = () => { flushPending(); };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      flushPending();
    };
  }, [flushPending]);

  useAppRefresh(loadListsAndItems);

  useEffect(() => {
    const handlePartAdded = () => {
      loadListsAndItems();
    };
    window.addEventListener('part-added-to-list', handlePartAdded);
    return () => {
      window.removeEventListener('part-added-to-list', handlePartAdded);
    };
  }, [loadListsAndItems]);

  /** Atualiza a tela na hora (otimista) e grava agora ou com espera. */
  const handleItemsChange = useCallback(
    (items: SimplePartItem[], opts?: { debounce?: boolean }) => {
      if (!activeList) return;
      const listId = activeList.id;
      const updatedAt = new Date().toISOString();
      setListItems(items);
      setActiveList(prev => (prev && prev.id === listId ? { ...prev, items, updatedAt } : prev));
      setLists(prev => prev.map(l => (l.id === listId ? { ...l, items, updatedAt } : l)));
      pendingRef.current = { listId, items };
      window.clearTimeout(timerRef.current);
      if (opts?.debounce) timerRef.current = window.setTimeout(flushPending, SAVE_DELAY_MS);
      else flushPending();
    },
    [activeList, flushPending],
  );

  const handleSelectList = async (id: string) => {
    await flushPending();
    await setActiveListId(company, id);
    await loadListsAndItems();
  };

  const handleCreateList = async (name: string, icon?: ListIconData | null) => {
    const newList = await createList(company, name, icon);
    await setActiveListId(company, newList.id);
    await loadListsAndItems();
    showSuccess(`Lista "${newList.name}" criada com sucesso!`);
  };

  const handleRenameList = async (id: string, newName: string, icon?: ListIconData | null) => {
    await renameList(company, id, newName, icon);
    await loadListsAndItems();
    showSuccess('Lista atualizada com sucesso!');
  };

  const handleDuplicateList = async (id: string) => {
    await flushPending();
    await duplicateList(company, id);
    await loadListsAndItems();
    showSuccess('Lista duplicada com sucesso!');
  };

  const handleDeleteList = async (id: string) => {
    try {
      await flushPending();
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
    if (activeList) {
      await renameList(company, activeList.id, newTitle);
      // Atualiza apenas o estado local das listas para evitar re-renderização pesada
      const data = await getListsData(company);
      setLists(data.lists);
    }
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      {isCompact ? (
        <PartsListMobile
          lists={lists}
          activeList={activeList}
          items={listItems}
          isLoading={isLoading}
          onItemsChange={handleItemsChange}
          onReload={loadListsAndItems}
          onSelectList={handleSelectList}
          onCreateList={handleCreateList}
          onRenameList={handleRenameList}
          onDuplicateList={handleDuplicateList}
          onDeleteList={handleDeleteList}
        />
      ) : (
        <PartsListDesktop
          lists={lists}
          activeList={activeList}
          items={listItems}
          isLoading={isLoading}
          listTitle={listTitle}
          onReload={loadListsAndItems}
          onItemsReordered={handleItemsChange}
          onTitleChange={handleTitleChange}
          onSelectList={handleSelectList}
          onCreateList={handleCreateList}
          onRenameList={handleRenameList}
          onDuplicateList={handleDuplicateList}
          onDeleteList={handleDeleteList}
          onReorderLists={handleReorderLists}
        />
      )}
    </Suspense>
  );
};

export default PartsList;
