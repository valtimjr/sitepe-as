import {
  addLocalSimplePartItem,
  getLocalSimplePartsListItems,
  updateLocalSimplePartItem,
  deleteLocalSimplePartItem,
  clearLocalSimplePartsList,
  SimplePartItem as LocalSimplePartItem,
} from '@/services/localDbService';

export interface SimplePartItem extends LocalSimplePartItem {}

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