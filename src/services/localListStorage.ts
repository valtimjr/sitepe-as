import { v4 as uuidv4 } from 'uuid';
import { SimplePartItem, localDb } from './localDbService';
import { CompanyType } from '@/types/company';

export interface LocalList {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: SimplePartItem[];
}

export interface LocalListsData {
  activeListId: string;
  lists: LocalList[];
}

const STORAGE_KEY_PREFIX = 'autoboard_lists_v2_';

/**
 * Gets the storage key for a specific company.
 */
const getStorageKey = (company: CompanyType): string => {
  return `${STORAGE_KEY_PREFIX}${company}`;
};

/**
 * Formats a list's items into a text representation for sharing/copying.
 */
export const formatListText = (list: LocalList, companyName: string): string => {
  if (!list.items || list.items.length === 0) return '';

  let formattedText = `${list.name} (${companyName})\n\n`;

  list.items.forEach(item => {
    const quantidade = item.quantidade ?? 1;
    const codigo = item.codigo_peca || '';
    const descricao = item.descricao || '';
    const af = item.af ? ` (AF: ${item.af})` : '';
    
    formattedText += `${quantidade} - ${codigo} ${descricao}${af}`.trim() + '\n';
  });

  return formattedText.trim();
};

/**
 * Loads lists data from LocalStorage. If none exists, attempts to migrate from Dexie.
 */
export const getListsData = async (company: CompanyType): Promise<LocalListsData> => {
  const key = getStorageKey(company);
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as LocalListsData;
      if (parsed && parsed.lists && parsed.lists.length > 0) {
        // Ensure activeListId is valid
        const activeExists = parsed.lists.some(l => l.id === parsed.activeListId);
        if (!activeExists) {
          parsed.activeListId = parsed.lists[0].id;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing lists from localStorage:', e);
    }
  }

  // Migration from Dexie simplePartsList
  let existingItems: SimplePartItem[] = [];
  try {
    existingItems = await localDb.simplePartsList.where('company').equals(company).toArray();
  } catch (e) {
    console.error('Error reading from Dexie simplePartsList:', e);
  }

  const defaultListId = uuidv4();
  const defaultList: LocalList = {
    id: defaultListId,
    name: 'Principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: existingItems.map(item => ({
      ...item,
      company // Ensure company is set
    }))
  };

  const initialData: LocalListsData = {
    activeListId: defaultListId,
    lists: [defaultList]
  };

  saveListsData(company, initialData);
  return initialData;
};

/**
 * Saves lists data to LocalStorage.
 */
export const saveListsData = (company: CompanyType, data: LocalListsData): void => {
  const key = getStorageKey(company);
  localStorage.setItem(key, JSON.stringify(data));
  // Dispatch event to notify components of list changes
  window.dispatchEvent(new CustomEvent('autoboard-lists-changed', { detail: { company } }));
};

/**
 * Gets the currently active list.
 */
export const getActiveList = async (company: CompanyType): Promise<LocalList> => {
  const data = await getListsData(company);
  const active = data.lists.find(l => l.id === data.activeListId);
  if (active) return active;
  
  // Fallback if active list not found
  return data.lists[0];
};

/**
 * Sets the active list ID.
 */
export const setActiveListId = async (company: CompanyType, id: string): Promise<void> => {
  const data = await getListsData(company);
  if (data.lists.some(l => l.id === id)) {
    data.activeListId = id;
    saveListsData(company, data);
  }
};

/**
 * Creates a new list and returns it.
 */
export const createList = async (company: CompanyType, name: string): Promise<LocalList> => {
  const data = await getListsData(company);
  const newList: LocalList = {
    id: uuidv4(),
    name: name.trim() || `Lista ${data.lists.length + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: []
  };
  
  data.lists.push(newList);
  saveListsData(company, data);
  return newList;
};

/**
 * Renames a list.
 */
export const renameList = async (company: CompanyType, id: string, newName: string): Promise<void> => {
  const data = await getListsData(company);
  const list = data.lists.find(l => l.id === id);
  if (list) {
    list.name = newName.trim() || list.name;
    list.updatedAt = new Date().toISOString();
    saveListsData(company, data);
  }
};

/**
 * Duplicates a list.
 */
export const duplicateList = async (company: CompanyType, id: string): Promise<void> => {
  const data = await getListsData(company);
  const list = data.lists.find(l => l.id === id);
  if (list) {
    const duplicated: LocalList = {
      id: uuidv4(),
      name: `${list.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: list.items.map(item => ({
        ...item,
        id: uuidv4() // New ID for each item
      }))
    };
    data.lists.push(duplicated);
    saveListsData(company, data);
  }
};

/**
 * Deletes a list.
 */
export const deleteList = async (company: CompanyType, id: string): Promise<void> => {
  const data = await getListsData(company);
  if (data.lists.length <= 1) {
    throw new Error('Não é possível excluir a única lista existente.');
  }

  const index = data.lists.findIndex(l => l.id === id);
  if (index !== -1) {
    data.lists.splice(index, 1);
    // If we deleted the active list, set active to the first available list
    if (data.activeListId === id) {
      data.activeListId = data.lists[0].id;
    }
    saveListsData(company, data);
  }
};

/**
 * Reorders lists based on an array of IDs.
 */
export const reorderLists = async (company: CompanyType, orderedIds: string[]): Promise<void> => {
  const data = await getListsData(company);
  const reordered: LocalList[] = [];
  
  orderedIds.forEach(id => {
    const list = data.lists.find(l => l.id === id);
    if (list) {
      reordered.push(list);
    }
  });

  // Append any lists that might have been missed
  data.lists.forEach(list => {
    if (!reordered.some(l => l.id === list.id)) {
      reordered.push(list);
    }
  });

  data.lists = reordered;
  saveListsData(company, data);
};

/**
 * Adds an item to a specific list.
 */
export const addItemToList = async (
  company: CompanyType,
  listId: string,
  item: Omit<SimplePartItem, 'id'>
): Promise<string> => {
  const data = await getListsData(company);
  const list = data.lists.find(l => l.id === listId);
  if (!list) {
    throw new Error('Lista não encontrada.');
  }

  const itemId = uuidv4();
  const newItem: SimplePartItem = {
    ...item,
    id: itemId,
    created_at: new Date(),
    company
  };

  list.items.push(newItem);
  list.updatedAt = new Date().toISOString();
  saveListsData(company, data);
  return itemId;
};

/**
 * Adds an item to the active list.
 */
export const addItemToActiveList = async (
  company: CompanyType,
  item: Omit<SimplePartItem, 'id'>
): Promise<string> => {
  const data = await getListsData(company);
  return addItemToList(company, data.activeListId, item);
};

/**
 * Updates an item in the active list.
 */
export const updateItemInActiveList = async (
  company: CompanyType,
  updatedItem: SimplePartItem
): Promise<void> => {
  const data = await getListsData(company);
  const list = data.lists.find(l => l.id === data.activeListId);
  if (list) {
    const index = list.items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      list.items[index] = {
        ...updatedItem,
        company
      };
      list.updatedAt = new Date().toISOString();
      saveListsData(company, data);
    }
  }
};

/**
 * Deletes an item from the active list.
 */
export const deleteItemFromActiveList = async (
  company: CompanyType,
  itemId: string
): Promise<void> => {
  const data = await getListsData(company);
  const list = data.lists.find(l => l.id === data.activeListId);
  if (list) {
    const index = list.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      list.items.splice(index, 1);
      list.updatedAt = new Date().toISOString();
      saveListsData(company, data);
    }
  }
};

/**
 * Clears all items from the active list.
 */
export const clearActiveList = async (company: CompanyType): Promise<void> => {
  const data = await getListsData(company);
  const list = data.lists.find(l => l.id === data.activeListId);
  if (list) {
    list.items = [];
    list.updatedAt = new Date().toISOString();
    saveListsData(company, data);
  }
};
