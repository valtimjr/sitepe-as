import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

export interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
}

class LocalDexieDb extends Dexie {
  listItems!: Table<ListItem>;

  constructor() {
    super('PartsListDatabase');
    this.version(1).stores({
      listItems: '++id, codigo_peca, af', // Primary key 'id', indexed 'codigo_peca' and 'af'
    });
  }
}

export const localDb = new LocalDexieDb();

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