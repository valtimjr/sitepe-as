import { v4 as uuidv4 } from 'uuid';

export interface Part {
  codigo: string;
  descricao: string;
}

export interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
}

const PARTS_STORAGE_KEY = 'parts_data';
const LIST_ITEMS_STORAGE_KEY = 'list_items_data';

// --- Parts Management ---

export const getParts = (): Part[] => {
  const partsJson = localStorage.getItem(PARTS_STORAGE_KEY);
  return partsJson ? JSON.parse(partsJson) : [];
};

export const insertPart = (part: Part): void => {
  const parts = getParts();
  const existingPart = parts.find(p => p.codigo === part.codigo);
  if (existingPart) {
    // Update existing part if found
    Object.assign(existingPart, part);
  } else {
    parts.push(part);
  }
  localStorage.setItem(PARTS_STORAGE_KEY, JSON.stringify(parts));
};

export const searchParts = (query: string): Part[] => {
  const parts = getParts();
  if (!query) return parts;
  const lowerCaseQuery = query.toLowerCase();
  return parts.filter(
    (part) =>
      part.codigo.toLowerCase().includes(lowerCaseQuery) ||
      part.descricao.toLowerCase().includes(lowerCaseQuery)
  );
};

// --- List Items Management ---

export const getListItems = (): ListItem[] => {
  const listItemsJson = localStorage.getItem(LIST_ITEMS_STORAGE_KEY);
  return listItemsJson ? JSON.parse(listItemsJson) : [];
};

export const addItemToList = (item: Omit<ListItem, 'id'>): void => {
  const listItems = getListItems();
  listItems.push({ ...item, id: uuidv4() });
  localStorage.setItem(LIST_ITEMS_STORAGE_KEY, JSON.stringify(listItems));
};

export const updateListItem = (updatedItem: ListItem): void => {
  const listItems = getListItems();
  const index = listItems.findIndex(item => item.id === updatedItem.id);
  if (index !== -1) {
    listItems[index] = updatedItem;
    localStorage.setItem(LIST_ITEMS_STORAGE_KEY, JSON.stringify(listItems));
  }
};

export const deleteListItem = (id: string): void => {
  const listItems = getListItems();
  const updatedList = listItems.filter(item => item.id !== id);
  localStorage.setItem(LIST_ITEMS_STORAGE_KEY, JSON.stringify(updatedList));
};

export const clearList = (): void => {
  localStorage.removeItem(LIST_ITEMS_STORAGE_KEY);
};

export const getUniqueAfs = (): string[] => {
  const listItems = getListItems();
  const afs = new Set<string>();
  listItems.forEach(item => {
    if (item.af) {
      afs.add(item.af);
    }
  });
  return Array.from(afs).sort();
};

// Initialize with some dummy data if empty
(() => {
  if (getParts().length === 0) {
    insertPart({ codigo: 'P001', descricao: 'Filtro de Óleo' });
    insertPart({ codigo: 'P002', descricao: 'Vela de Ignição' });
    insertPart({ codigo: 'P003', descricao: 'Pastilha de Freio' });
    insertPart({ codigo: 'P004', descricao: 'Correia Dentada' });
    insertPart({ codigo: 'P005', descricao: 'Bateria 12V' });
    insertPart({ codigo: 'P006', descricao: 'Pneu Aro 15' });
    insertPart({ codigo: 'P007', descricao: 'Amortecedor Dianteiro' });
    insertPart({ codigo: 'P008', descricao: 'Lâmpada H4' });
    insertPart({ codigo: 'P009', descricao: 'Óleo Motor 5W30' });
    insertPart({ codigo: 'P010', descricao: 'Disco de Freio' });
  }
})();