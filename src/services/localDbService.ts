import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { DailyApontamento, MonthlyApontamento, DailyServiceOrder, Part as SupabasePart, Af as SupabaseAf } from '@/types/supabase';
import { Network } from '@capacitor/network';
import { CompanyType } from '@/types/company';

// Use the strict types from supabase.ts for local storage interfaces
export interface Part extends SupabasePart {
  company?: CompanyType;
}
export interface Af extends SupabaseAf {
  company?: CompanyType;
}

export interface SimplePartItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af?: string; 
  created_at?: Date;
  company?: CompanyType;
}

export interface ServiceOrderItem {
  id: string;
  af: string;
  os?: string;
  hora_inicio?: string;
  hora_final?: string;
  servico_executado?: string;
  parts: { codigo_peca: string; descricao: string; quantidade: number }[];
  created_at?: Date;
  company?: CompanyType;
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
    // Version incremented to 9 to include 'company' column in indexes where useful
    this.version(9).stores({
      simplePartsList: 'id, codigo_peca, descricao, quantidade, af, created_at, company',
      serviceOrderItems: '++id, af, os, hora_inicio, hora_final, servico_executado, created_at, company',
      parts: '++id, codigo, descricao, tags, name, itens_relacionados, company',
      afs: '++id, af_number, descricao, company',
      monthlyApontamentos: 'id, user_id, month_year, company, [user_id+month_year+company]',
      dailyServiceOrders: 'id, user_id, date, company, [user_id+date+company]',
    });
  }
}

export const localDb = new LocalDexieDb();

// --- Monthly Apontamentos Management ---

export const getLocalMonthlyApontamento = async (userId: string, monthYear: string, company: CompanyType): Promise<MonthlyApontamento | undefined> => {
  return localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear, company }).first();
};

export const putLocalMonthlyApontamento = async (ap: MonthlyApontamento): Promise<void> => {
  await localDb.monthlyApontamentos.put(ap);
};

export const bulkPutLocalMonthlyApontamentos = async (items: MonthlyApontamento[]): Promise<void> => {
  await localDb.monthlyApontamentos.bulkPut(items);
};

export const deleteLocalMonthlyApontamento = async (userId: string, monthYear: string, company: CompanyType): Promise<void> => {
  await localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear, company }).delete();
};

// --- Daily Service Orders Management ---

export const getLocalDailyServiceOrder = async (userId: string, date: string, company: CompanyType): Promise<DailyServiceOrder | undefined> => {
  return localDb.dailyServiceOrders.where({ user_id: userId, date: date, company }).first();
};

export const putLocalDailyServiceOrder = async (order: DailyServiceOrder): Promise<void> => {
  await localDb.dailyServiceOrders.put(order);
};

export const deleteLocalDailyServiceOrder = async (userId: string, date: string, company: CompanyType): Promise<void> => {
  await localDb.dailyServiceOrders.where({ user_id: userId, date: date, company }).delete();
};

// --- Parts Management ---

export const addLocalPart = async (part: Omit<Part, 'id'>): Promise<string> => {
  const newPart = { ...part, id: uuidv4() };
  await localDb.parts.add(newPart as Part);
  return newPart.id;
};

export const bulkPutLocalParts = async (parts: Part[]): Promise<void> => {
  await localDb.parts.bulkPut(parts);
};

export const getLocalParts = async (company: CompanyType): Promise<Part[]> => {
  return localDb.parts.where('company').equals(company).toArray();
};

export const searchLocalParts = async (query: string, company: CompanyType): Promise<Part[]> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  const allParts = await localDb.parts.where('company').equals(company).toArray();
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

export const getLocalAfs = async (company: CompanyType): Promise<Af[]> => {
  return localDb.afs.where('company').equals(company).toArray();
};

// --- Simple Parts List ---

export const getLocalSimplePartsListItems = async (company: CompanyType): Promise<SimplePartItem[]> => {
  return localDb.simplePartsList.where('company').equals(company).toArray();
};

export const addLocalSimplePartItem = async (item: Omit<SimplePartItem, 'id'>, company: CompanyType, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date(), company };
  await localDb.simplePartsList.add(newItem);
  return newItem.id;
};

export const updateLocalSimplePartItem = async (updatedItem: SimplePartItem): Promise<void> => {
  await localDb.simplePartsList.update(updatedItem.id, updatedItem);
};

export const deleteLocalSimplePartItem = async (id: string): Promise<void> => {
  await localDb.simplePartsList.delete(id);
};

export const clearLocalSimplePartsList = async (company: CompanyType): Promise<void> => {
  await localDb.simplePartsList.where('company').equals(company).delete();
};

// --- Service Order Items (Legacy) ---

export const getLocalServiceOrderItems = async (company: CompanyType): Promise<ServiceOrderItem[]> => {
  return localDb.serviceOrderItems.where('company').equals(company).toArray();
};

export const addLocalServiceOrderItem = async (item: Omit<ServiceOrderItem, 'id'>, company: CompanyType, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date(), company };
  await localDb.serviceOrderItems.add(newItem);
  return newItem.id;
};

export const updateLocalServiceOrderItem = async (updatedItem: ServiceOrderItem): Promise<void> => {
  await localDb.serviceOrderItems.update(updatedItem.id, updatedItem as any);
};

export const deleteLocalServiceOrderItem = async (id: string): Promise<void> => {
  await localDb.serviceOrderItems.delete(id);
};

export const clearLocalServiceOrderItems = async (company: CompanyType): Promise<void> => {
  await localDb.serviceOrderItems.where('company').equals(company).delete();
};
