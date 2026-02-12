import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { DailyApontamento, MonthlyApontamento, DailyServiceOrder, Part as SupabasePart, Af as SupabaseAf } from '@/types/supabase';
import { Network } from '@capacitor/network';

// Use the strict types from supabase.ts for local storage interfaces
export interface Part extends SupabasePart {}
export interface Af extends SupabaseAf {}

export interface SimplePartItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af?: string; 
  created_at?: Date;
}

export interface ServiceOrderItem {
  id: string;
  codigo_peca?: string;
  descricao?: string;
  quantidade?: number;
  af: string;
  os?: number;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  created_at?: Date;
}

export type Apontamento = DailyApontamento;

// Helper function to check network status
export const isOnline = async () => {
    try {
        const status = await Network.getStatus();
        return status.connected;
    } catch (e) {
        return navigator.onLine;
    }
};

class LocalDexieDb extends Dexie {
  simplePartsList!: Table<SimplePartItem>;
  serviceOrderItems!: Table<ServiceOrderItem>;
  parts!: Table<Part>;
  afs!: Table<Af>;
  monthlyApontamentos!: Table<MonthlyApontamento>;
  dailyServiceOrders!: Table<DailyServiceOrder>;

  constructor() {
    super('PartsListDatabase');
    this.version(8).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at',
      parts: '++id, codigo, descricao, tags, name, itens_relacionados',
      afs: '++id, af_number, descricao',
      monthlyApontamentos: 'id, user_id, month_year, [user_id+month_year]',
      dailyServiceOrders: 'id, user_id, date, [user_id+date]',
    });
  }
}

export const localDb = new LocalDexieDb();

// --- Monthly Apontamentos Management ---

export const getLocalMonthlyApontamento = async (userId: string, monthYear: string): Promise<MonthlyApontamento | undefined> => {
  return localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear }).first();
};

export const putLocalMonthlyApontamento = async (ap: MonthlyApontamento): Promise<void> => {
  await localDb.monthlyApontamentos.put(ap);
};

export const deleteLocalMonthlyApontamento = async (userId: string, monthYear: string): Promise<void> => {
  await localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear }).delete();
};

// --- Daily Service Orders Management ---

export const getLocalDailyServiceOrder = async (userId: string, date: string): Promise<DailyServiceOrder | undefined> => {
  return localDb.dailyServiceOrders.where({ user_id: userId, date: date }).first();
};

export const putLocalDailyServiceOrder = async (order: DailyServiceOrder): Promise<void> => {
  await localDb.dailyServiceOrders.put(order);
};

export const deleteLocalDailyServiceOrder = async (userId: string, date: string): Promise<void> => {
  await localDb.dailyServiceOrders.where({ user_id: userId, date: date }).delete();
};

// --- Parts Management ---

export const addLocalPart = async (part: Omit<Part, 'id'>): Promise<string> => {
  const newPart = { ...part, id: uuidv4() };
  await localDb.parts.add(newPart);
  return newPart.id;
};

export const bulkPutLocalParts = async (parts: Part[]): Promise<void> => {
  await localDb.parts.bulkPut(parts);
};

export const getLocalParts = async (): Promise<Part[]> => {
  return localDb.parts.toArray();
};

export const searchLocalParts = async (query: string): Promise<Part[]> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  const allParts = await localDb.parts.toArray();
  if (!lowerCaseQuery) return allParts;
  const escapedWords = lowerCaseQuery.split(/\s+/).filter(Boolean).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regexPattern = new RegExp(escapedWords.join('.*'), 'i');
  return allParts.filter(part => {
    const nameMatch = part.name && part.name.toLowerCase().match(regexPattern);
    const codigoMatch = part.codigo.toLowerCase().match(regexPattern);
    const descricaoMatch = part.descricao.toLowerCase().match(regexPattern);
    const tagsMatch = part.tags && part.tags.toLowerCase().match(regexPattern);
    return nameMatch || codigoMatch || descricaoMatch || tagsMatch;
  });
};

export const updateLocalPart = async (updatedPart: Part): Promise<void> => {
  await localDb.parts.put(updatedPart);
};

// --- AFs Management ---

export const bulkPutLocalAfs = async (afs: Af[]): Promise<void> => {
  await localDb.afs.bulkPut(afs);
};

export const getLocalAfs = async (): Promise<Af[]> => {
  return localDb.afs.toArray();
};

// --- Simple Parts List ---

export const getLocalSimplePartsListItems = async (): Promise<SimplePartItem[]> => {
  return localDb.simplePartsList.toArray();
};

export const addLocalSimplePartItem = async (item: Omit<SimplePartItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date() };
  await localDb.simplePartsList.add(newItem);
  return newItem.id;
};

export const updateLocalSimplePartItem = async (updatedItem: SimplePartItem): Promise<void> => {
  await localDb.simplePartsList.update(updatedItem.id, updatedItem);
};

export const deleteLocalSimplePartItem = async (id: string): Promise<void> => {
  await localDb.simplePartsList.delete(id);
};

export const clearLocalSimplePartsList = async (): Promise<void> => {
  await localDb.simplePartsList.clear();
};

// --- Service Order Items (Legacy) ---

export const getLocalServiceOrderItems = async (): Promise<ServiceOrderItem[]> => {
  return localDb.serviceOrderItems.toArray();
};

export const addLocalServiceOrderItem = async (item: Omit<ServiceOrderItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date() };
  await localDb.serviceOrderItems.add(newItem);
  return newItem.id;
};

export const updateLocalServiceOrderItem = async (updatedItem: ServiceOrderItem): Promise<void> => {
  await localDb.serviceOrderItems.update(updatedItem.id, updatedItem);
};

export const deleteLocalServiceOrderItem = async (id: string): Promise<void> => {
  await localDb.serviceOrderItems.delete(id);
};

export const clearLocalServiceOrderItems = async (): Promise<void> => {
  await localDb.serviceOrderItems.clear();
};