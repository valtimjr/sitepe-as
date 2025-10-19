import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import {
  localDb,
  getLocalUniqueAfs,
  bulkAddLocalParts,
  getLocalParts,
  searchLocalParts,
  updateLocalPart,
  bulkAddLocalAfs,
  getLocalAfs,
  Part as LocalPart,
  SimplePartItem as LocalSimplePartItem, // Nova importação
  ServiceOrderItem as LocalServiceOrderItem, // Nova importação
  Af as LocalAf,
  addLocalSimplePartItem, // Nova função
  getLocalSimplePartsListItems, // Nova função
  updateLocalSimplePartItem, // Nova função
  deleteLocalSimplePartItem, // Nova função
  clearLocalSimplePartsList, // Nova função
  addLocalServiceOrderItem, // Nova função
  getLocalServiceOrderItems, // Nova função
  updateLocalServiceOrderItem, // Nova função
  deleteLocalServiceOrderItem, // Nova função
  clearLocalServiceOrderItems, // Nova função
} from '@/services/localDbService';

export interface Part extends LocalPart {}
export interface SimplePartItem extends LocalSimplePartItem {} // Nova interface exportada
export interface ServiceOrderItem extends LocalServiceOrderItem {} // Nova interface exportada
export interface Af extends LocalAf {}

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
          console.log('Parsed parts from CSV, including tags:', parsedParts);
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

const seedAfsFromCsv = async (): Promise<void> => {
  const afsCount = await localDb.afs.count();
  if (afsCount > 0) {
    console.log('AFs already seeded in IndexedDB.');
    return;
  }

  try {
    const response = await fetch('/afs.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    await new Promise<void>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedAfs: Af[] = results.data.map((row: any) => ({
            id: uuidv4(),
            af_number: row.af_number,
          }));
          await bulkAddLocalAfs(parsedAfs);
          console.log('AFs seeded from CSV to IndexedDB.');
          resolve();
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Failed to fetch or parse afs.csv or seed IndexedDB:", error);
  }
};

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

// --- Funções para SimplePartItem (Lista de Peças Simples) ---
export const getSimplePartsListItems = async (): Promise<SimplePartItem[]> => {
  return getLocalSimplePartsListItems();
};

export const addSimplePartItem = async (item: Omit<SimplePartItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  return addLocalSimplePartItem(item, customCreatedAt);
};

export const updateSimplePartItem = async (updatedItem: SimplePartItem): Promise<void> => {
  await updateLocalSimplePartItem(updatedItem);
};

export const deleteSimplePartItem = async (id: string): Promise<void> => {
  await deleteLocalSimplePartItem(id);
};

export const clearSimplePartsList = async (): Promise<void> => {
  await clearLocalSimplePartsList();
};

// --- Funções para ServiceOrderItem (Lista de Ordens de Serviço) ---
export const getServiceOrderItems = async (): Promise<ServiceOrderItem[]> => {
  return getLocalServiceOrderItems();
};

export const addServiceOrderItem = async (item: Omit<ServiceOrderItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  return addLocalServiceOrderItem(item, customCreatedAt);
};

export const updateServiceOrderItem = async (updatedItem: ServiceOrderItem): Promise<void> => {
  await updateLocalServiceOrderItem(updatedItem);
};

export const deleteServiceOrderItem = async (id: string): Promise<void> => {
  await deleteLocalServiceOrderItem(id);
};

export const clearServiceOrderList = async (): Promise<void> => {
  await clearLocalServiceOrderItems();
};

export const getUniqueAfs = async (): Promise<string[]> => {
  await seedAfsFromCsv();
  return getLocalUniqueAfs();
};