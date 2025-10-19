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
  SimplePartItem as LocalSimplePartItem,
  ServiceOrderItem as LocalServiceOrderItem,
  Af as LocalAf,
  addLocalSimplePartItem,
  getLocalSimplePartsListItems,
  updateLocalSimplePartItem,
  deleteLocalSimplePartItem,
  clearLocalSimplePartsList,
  addLocalServiceOrderItem,
  getLocalServiceOrderItems,
  updateLocalServiceOrderItem,
  deleteLocalServiceOrderItem,
  clearLocalServiceOrderItems,
} from '@/services/localDbService';

export interface Part extends LocalPart {}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface ServiceOrderItem extends LocalServiceOrderItem {}
export interface Af extends LocalAf {}

const seedPartsFromJson = async (): Promise<void> => {
  const partsCount = await localDb.parts.count();
  if (partsCount > 0) {
    console.log('Parts already seeded in IndexedDB.');
    return;
  }

  try {
    const response = await fetch('/src/data/parts.json'); // <--- Caminho atualizado
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const parsedParts: Part[] = await response.json();
    console.log('Parsed parts from JSON:', parsedParts);
    await bulkAddLocalParts(parsedParts);
    console.log('Parts seeded from JSON to IndexedDB.');
  } catch (error) {
    console.error("Failed to fetch or parse parts.json or seed IndexedDB:", error);
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
      // Papa.parse is still used for afs.csv
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          const parsedAfs: Af[] = results.data.map((row: any) => ({
            id: uuidv4(),
            af_number: row.af_number,
          }));
          await bulkAddLocalAfs(parsedAfs);
          console.log('AFs seeded from CSV to IndexedDB.');
          resolve();
        },
        error: (error: Error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Failed to fetch or parse afs.csv or seed IndexedDB:", error);
  }
};

export const getParts = async (): Promise<Part[]> => {
  await seedPartsFromJson();
  return getLocalParts();
};

export const searchParts = async (query: string): Promise<Part[]> => {
  await seedPartsFromJson();
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