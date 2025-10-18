import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid'; // Importa uuidv4 para gerar IDs
import {
  getLocalListItems,
  addLocalItemToList,
  updateLocalListItem,
  deleteLocalListItem,
  clearLocalList,
  getLocalUniqueAfs,
  ListItem as LocalListItem
} from '@/services/localDbService';

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
}

// Define a interface ListItem para ser compatível com o IndexedDB local
export interface ListItem extends LocalListItem {}

let cachedParts: Part[] | null = null;

const fetchAndParseCsv = async (): Promise<Part[]> => {
  if (cachedParts) {
    return cachedParts;
  }
  try {
    const response = await fetch('/parts.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedParts: Part[] = results.data.map((row: any) => ({
            id: row.id || uuidv4(), // Gera um ID se row.id estiver vazio
            codigo: row.codigo,
            descricao: row.descricao,
          }));
          cachedParts = parsedParts; // Cache the parsed data
          resolve(parsedParts);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Failed to fetch or parse parts.csv:", error);
    return []; // Return empty array on error
  }
};

// --- Parts Management (CSV File) ---

export const getParts = async (): Promise<Part[]> => {
  return fetchAndParseCsv();
};

export const searchParts = async (query: string): Promise<Part[]> => {
  const allParts = await fetchAndParseCsv();
  if (!query) return allParts;

  const lowerCaseQuery = query.toLowerCase();
  return allParts.filter(part =>
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