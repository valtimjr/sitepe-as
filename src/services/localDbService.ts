import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags?: string; // Adiciona o campo tags
}

export interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
}

class LocalDexieDb extends Dexie {
  listItems!: Table<ListItem>;
  parts!: Table<Part>; // Nova tabela para as peças

  constructor() {
    super('PartsListDatabase');
    this.version(1).stores({
      listItems: '++id, codigo_peca, af',
      parts: '++id, codigo, descricao, tags', // Adiciona a tabela de peças com tags
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

export const clearLocalParts = async (): Promise<void> => {
  await localDb.parts.clear();
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

export const getLocalUniqueAfs = async (): Promise<string[]> => {
  const items = await localDb.listItems.toArray();
  const afs = new Set<string>();
  items.forEach(item => {
    if (item.af) {
      afs.add(item.af);
    }
  });
  return Array.from(afs).sort();
};