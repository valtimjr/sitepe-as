import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import {
  localDb,
  getLocalListItems,
  addLocalItemToList,
  updateLocalListItem,
  deleteLocalListItem,
  clearLocalList,
  getLocalUniqueAfs,
  bulkAddLocalParts,
  getLocalParts,
  searchLocalParts,
  updateLocalPart, // Importa a nova função
  Part as LocalPart,
  ListItem as LocalListItem
} from '@/services/localDbService';

export interface Part extends LocalPart {}

export interface ListItem extends LocalListItem {}

const seedPartsFromCsv = async (): Promise<void> => {
  const partsCount = await localDb.parts.count();
  if (partsCount > 0) {
    console.log('Parts already seeded in IndexedDB.');
    return;
  }

  try {
    const response = await fetch('/parts.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    await new Promise<void>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedParts: Part[] = results.data.map((row: any) => ({
            id: row.id || uuidv4(),
            codigo: row.codigo,
            descricao: row.descricao,
            tags: row.tags || '',
          }));
          await bulkAddLocalParts(parsedParts);
          console.log('Parts seeded from CSV to IndexedDB.');
          resolve();
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Failed to fetch or parse parts.csv or seed IndexedDB:", error);
  }
};

// --- Parts Management (IndexedDB) ---

export const getParts = async (): Promise<Part[]> => {
  await seedPartsFromCsv();
  return getLocalParts();
};

export const searchParts = async (query: string): Promise<Part[]> => {
  await seedPartsFromCsv();
  return searchLocalParts(query);
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  await updateLocalPart(updatedPart);
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