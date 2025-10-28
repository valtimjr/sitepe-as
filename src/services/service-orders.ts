import { v4 as uuidv4 } from 'uuid';
import {
  addLocalServiceOrderItem,
  getLocalServiceOrderItems,
  updateLocalServiceOrderItem,
  deleteLocalServiceOrderItem,
  clearLocalServiceOrderItems,
  ServiceOrderItem as LocalServiceOrderItem,
} from '@/services/localDbService';

export interface ServiceOrderItem extends LocalServiceOrderItem {}

export const getServiceOrderItems = async (): Promise<ServiceOrderItem[]> => {
  return getLocalServiceOrderItems();
};

export const addServiceOrderItem = async (item: Omit<ServiceOrderItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date() };
  return addLocalServiceOrderItem(newItem, customCreatedAt);
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