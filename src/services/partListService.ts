import {
  getParts as getLocalParts,
  insertPart as insertLocalPart,
  searchParts as searchLocalParts,
  getListItems as getLocalListItems,
  addItemToList as addLocalItemToList,
  updateListItem as updateLocalListItem,
  deleteListItem as deleteLocalListItem,
  clearList as clearLocalList,
  getUniqueAfs as getLocalUniqueAfs,
} from '@/integrations/localdb'; // Importa as funções do banco de dados local

export interface Part {
  id: string; // Adiciona ID para consistência com o IndexedDB
  codigo: string;
  descricao: string;
}

export interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
  user_id: string; // Mantém user_id para simular associação, mas será um ID fixo local
}

// --- Parts Management (Local IndexedDB) ---

export const getParts = async (): Promise<Part[]> => {
  return getLocalParts();
};

export const insertPart = async (part: Omit<Part, 'id'>): Promise<void> => {
  return insertLocalPart(part);
};

export const searchParts = async (query: string): Promise<Part[]> => {
  return searchLocalParts(query);
};

// --- List Items Management (Local IndexedDB) ---

export const getListItems = async (): Promise<ListItem[]> => {
  // Não há necessidade de verificar o usuário aqui, pois o user_id é fixo localmente
  return getLocalListItems();
};

export const addItemToList = async (item: Omit<ListItem, 'id' | 'user_id'>): Promise<void> => {
  // O user_id será adicionado automaticamente pelo serviço local
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