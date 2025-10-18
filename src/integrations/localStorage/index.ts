import { v4 as uuidv4 } from 'uuid';
import { ListItem } from '@/services/partListService';

const LIST_ITEMS_KEY = 'partsManagerListItems';
const LOCAL_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Fixed local user ID

const getStoredListItems = (): ListItem[] => {
  try {
    const storedItems = localStorage.getItem(LIST_ITEMS_KEY);
    return storedItems ? JSON.parse(storedItems) : [];
  } catch (error) {
    console.error('Failed to parse list items from localStorage:', error);
    return [];
  }
};

const saveListItems = (items: ListItem[]): void => {
  try {
    localStorage.setItem(LIST_ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save list items to localStorage:', error);
  }
};

export const getListItems = async (): Promise<ListItem[]> => {
  return Promise.resolve(getStoredListItems().filter(item => item.user_id === LOCAL_USER_ID));
};

export const addItemToList = async (item: Omit<ListItem, 'id' | 'user_id'>): Promise<void> => {
  const currentItems = getStoredListItems();
  const newItem: ListItem = { ...item, id: uuidv4(), user_id: LOCAL_USER_ID };
  saveListItems([...currentItems, newItem]);
  return Promise.resolve();
};

export const updateListItem = async (updatedItem: ListItem): Promise<void> => {
  const currentItems = getStoredListItems();
  const updatedItems = currentItems.map(item =>
    item.id === updatedItem.id && item.user_id === LOCAL_USER_ID ? { ...item, ...updatedItem } : item
  );
  saveListItems(updatedItems);
  return Promise.resolve();
};

export const deleteListItem = async (id: string): Promise<void> => {
  const currentItems = getStoredListItems();
  const filteredItems = currentItems.filter(item => item.id !== id || item.user_id !== LOCAL_USER_ID);
  saveListItems(filteredItems);
  return Promise.resolve();
};

export const clearList = async (): Promise<void> => {
  const currentItems = getStoredListItems();
  const otherUsersItems = currentItems.filter(item => item.user_id !== LOCAL_USER_ID);
  saveListItems(otherUsersItems);
  return Promise.resolve();
};

export const getUniqueAfs = async (): Promise<string[]> => {
  const currentItems = getStoredListItems();
  const afs = new Set<string>();
  currentItems.filter(item => item.user_id === LOCAL_USER_ID).forEach(item => {
    if (item.af) {
      afs.add(item.af);
    }
  });
  return Promise.resolve(Array.from(afs).sort());
};