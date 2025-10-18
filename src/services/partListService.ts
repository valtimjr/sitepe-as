import { staticParts, Part } from '@/data/parts'; // Importa as peças estáticas
import {
  getLocalListItems,
  addLocalItemToList,
  updateLocalListItem,
  deleteLocalListItem,
  clearLocalList,
  getLocalUniqueAfs,
  ListItem as LocalListItem // Renomeia para evitar conflito se Part e ListItem forem diferentes
} from '@/services/localDbService'; // Importa as funções do IndexedDB local

// Re-exporta a interface Part do arquivo de dados estáticos
export type { Part };

// Define a interface ListItem para ser compatível com o IndexedDB local
export interface ListItem extends LocalListItem {}

// --- Parts Management (Static File) ---

export const getParts = async (): Promise<Part[]> => {
  return staticParts;
};

export const searchParts = async (query: string): Promise<Part[]> => {
  if (!query) return staticParts;

  const lowerCaseQuery = query.toLowerCase();
  return staticParts.filter(part =>
    part.codigo.toLowerCase().includes(lowerCaseQuery) ||
    part.descricao.toLowerCase().includes(lowerCaseQuery)
  );
};

// --- List Items Management (IndexedDB Local) ---

export const getListItems = async (): Promise<ListItem[]> => {
  return getLocalListItems();
};

export const addItemToList = async (item: Omit<ListItem, 'id'>): Promise<void> => {
  await addLocalItemToList(item);
};

export const updateListItem = async (updatedItem: ListItem): Promise<void> => {
  await updateLocalListItem(updatedItem);
};

export const deleteListItem = async (id: string): Promise<void> => {
  await deleteLocalListItem(id);
};

export const clearList = async (): Promise<void> => {
  await clearLocalList();
};

export const getUniqueAfs = async (): Promise<string[]> => {
  return getLocalUniqueAfs();
};