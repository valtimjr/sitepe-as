import { staticParts } from '@/data/parts'; // Importa as peças estáticas
import {
  getListItems as getLocalListItems,
  addItemToList as addLocalItemToList,
  updateListItem as updateLocalListItem,
  deleteListItem as deleteLocalListItem,
  clearList as clearLocalList,
  getUniqueAfs as getLocalUniqueAfs,
} from '@/integrations/localStorage'; // Importa as funções do localStorage

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
}

export interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
  user_id: string;
}

// --- Parts Management (Static File) ---

export const getParts = async (): Promise<Part[]> => {
  return Promise.resolve(staticParts);
};

export const searchParts = async (query: string): Promise<Part[]> => {
  const allParts = staticParts;
  if (!query) {
    return Promise.resolve(allParts);
  }
  const lowerCaseQuery = query.toLowerCase();
  const filteredParts = allParts.filter(part =>
    part.codigo.toLowerCase().includes(lowerCaseQuery) ||
    part.descricao.toLowerCase().includes(lowerCaseQuery)
  );
  return Promise.resolve(filteredParts);
};

// --- List Items Management (Local Storage) ---

export const getListItems = async (): Promise<ListItem[]> => {
  return getLocalListItems();
};

export const addItemToList = async (item: Omit<ListItem, 'id' | 'user_id'>): Promise<void> => {
  return addLocalItemToList(item);
};

export const updateListItem = async (updatedItem: ListItem): Promise<void> => {
  return updateLocalListItem(updatedItem);
};

export const deleteListItem = async (id: string): Promise<void> => {
  return deleteLocalListItem(id);
};

export const clearList = async (): Promise<void> => {
  return clearLocalList();
};

export const getUniqueAfs = async (): Promise<string[]> => {
  return getLocalUniqueAfs();
};