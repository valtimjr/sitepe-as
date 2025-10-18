import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags?: string;
}

export interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
}

export interface Af {
  id: string;
  af_number: string;
}

class LocalDexieDb extends Dexie {
  listItems!: Table<ListItem>;
  parts!: Table<Part>;
  afs!: Table<Af>; // Nova tabela para os AFs

  constructor() {
    super('PartsListDatabase');
    this.version(1).stores({
      listItems: '++id, codigo_peca, af',
      parts: '++id, codigo, descricao, tags',
      afs: '++id, af_number', // Adiciona a tabela de AFs
    });
  }
}

export const localDb = new LocalDexieDb();

// --- Parts Management (IndexedDB) ---

export const addLocalPart = async (part: Omit<Part, 'id'>): Promise<string> => {
  const newPart = { ...part, id: uuidv4() };
  await localDb.parts.add(newPart);
  return newPart.id;
};

export const bulkAddLocalParts = async (parts: Part[]): Promise<void> => {
  await localDb.parts.bulkAdd(parts);
};

export const getLocalParts = async (): Promise<Part[]> => {
  return localDb.parts.toArray();
};

export const searchLocalParts = async (query: string): Promise<Part[]> => {
  if (!query) return localDb.parts.toArray();
  const lowerCaseQuery = query.toLowerCase();
  return localDb.parts
    .where('codigo')
    .startsWithIgnoreCase(lowerCaseQuery)
    .or('descricao')
    .startsWithIgnoreCase(lowerCaseQuery)
    .or('tags')
    .startsWithIgnoreCase(lowerCaseQuery)
    .toArray();
};

export const updateLocalPart = async (updatedPart: Part): Promise<void> => {
  await localDb.parts.update(updatedPart.id, updatedPart);
};

export const clearLocalParts = async (): Promise<void> => {
  await localDb.parts.clear();
};

// --- AFs Management (IndexedDB) ---
export const bulkAddLocalAfs = async (afs: Af[]): Promise<void> => {
  await localDb.afs.bulkAdd(afs);
};

export const getLocalAfs = async (): Promise<Af[]> => {
  return localDb.afs.toArray();
};

export const clearLocalAfs = async (): Promise<void> => {
  await localDb.afs.clear();
};

// --- List Items Management (IndexedDB) ---

export const getLocalListItems = async (): Promise<ListItem[]> => {
  return localDb.listItems.toArray();
};

export const addLocalItemToList = async (item: Omit<ListItem, 'id'>): Promise<string> => {
  const newItem = { ...item, id: uuidv4() };
  await localDb.listItems.add(newItem);
  return newItem.id;
};

export const updateLocalListItem = async (updatedItem: ListItem): Promise<void> => {
  await localDb.listItems.update(updatedItem.id, updatedItem);
};

export const deleteLocalListItem = async (id: string): Promise<void> => {
  await localDb.listItems.delete(id);
};

export const clearLocalList = async (): Promise<void> => {
  await localDb.listItems.clear();
};

// This function will now get AFs from the dedicated 'afs' table
export const getLocalUniqueAfs = async (): Promise<string[]> => {
  const afs = await localDb.afs.toArray();
  return afs.map(af => af.af_number).sort();
};