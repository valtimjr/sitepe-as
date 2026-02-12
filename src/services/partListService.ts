import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import {
  localDb,
  bulkPutLocalParts,
  getLocalParts,
  searchLocalParts,
  updateLocalPart,
  bulkPutLocalAfs,
  getLocalAfs,
  Part as LocalPart,
  SimplePartItem as LocalSimplePartItem,
  ServiceOrderItem as LocalServiceOrderItem,
  Af as LocalAf,
  addLocalSimplePartItem,
  getLocalSimplePartsListItems,
  updateLocalSimplePartItem,
  deleteLocalSimplePartItem,
  clearLocalSimplePartsList,
  addLocalServiceOrderItem,
  getLocalServiceOrderItems,
  updateLocalServiceOrderItem,
  deleteLocalServiceOrderItem,
  clearLocalServiceOrderItems,
  isOnline,
  getLocalMonthlyApontamento,
  putLocalMonthlyApontamento, 
  deleteLocalMonthlyApontamento,
  getLocalDailyServiceOrder,
  putLocalDailyServiceOrder,
  deleteLocalDailyServiceOrder
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';
import { Network } from '@capacitor/network';
import { format } from 'date-fns';
import { DailyApontamento, MonthlyApontamento, RelatedPart, Part as SupabasePart, DailyServiceOrder, ServiceOrderData, Af as SupabaseAf } from '@/types/supabase';

export interface Part extends SupabasePart {}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface ServiceOrderItem extends LocalServiceOrderItem {}
export interface Af extends LocalAf {}
export type Apontamento = DailyApontamento;

export const getLocalMonthlyApontamentoService = getLocalMonthlyApontamento;

const cleanDailyApontamento = (ap: DailyApontamento): DailyApontamento => {
  const { id, user_id, ...rest } = ap as any;
  return rest;
};

// --- Daily Service Orders Service (Supabase Sync) ---

export const syncDailyServiceOrderFromSupabase = async (userId: string, date: string): Promise<DailyServiceOrder | undefined> => {
  const { data, error } = await supabase
    .from('daily_service_orders')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(`[syncDailyServiceOrderFromSupabase] Error:`, error);
    return undefined;
  }

  if (data) {
    const remoteOrder = data as DailyServiceOrder;
    await putLocalDailyServiceOrder(remoteOrder);
    return remoteOrder;
  }
  return undefined;
};

export const saveDailyServiceOrder = async (order: DailyServiceOrder): Promise<void> => {
  const online = await isOnline();
  
  // Salva localmente primeiro
  await putLocalDailyServiceOrder({
    ...order,
    updated_at: new Date().toISOString()
  });

  if (online) {
    const { error } = await supabase
      .from('daily_service_orders')
      .upsert(order, { onConflict: 'user_id,date' });

    if (error) {
      console.error('[saveDailyServiceOrder] Supabase Error:', error);
      throw new Error(`Erro ao sincronizar com servidor: ${error.message}`);
    }
  }
};

export const getDailyServiceOrdersByDate = async (userId: string, date: string): Promise<ServiceOrderData[]> => {
  const online = await isOnline();
  let dailyOrder: DailyServiceOrder | undefined;

  if (online) {
    dailyOrder = await syncDailyServiceOrderFromSupabase(userId, date);
  } else {
    dailyOrder = await getLocalDailyServiceOrder(userId, date);
  }

  return dailyOrder?.os_list || [];
};

// --- Parts Management ---

export const searchPartsPaginated = async (query: string, page: number = 1, pageSize: number = 50): Promise<{ parts: Part[], totalCount: number }> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  const offset = (page - 1) * pageSize;
  let queryBuilder = supabase.from('parts').select('*', { count: 'exact' });
  if (lowerCaseQuery) {
    const searchPattern = `%${lowerCaseQuery.split(/\s+/).filter(Boolean).join('%')}%`;
    queryBuilder = queryBuilder.or(`codigo.ilike.${searchPattern},descricao.ilike.${searchPattern},tags.ilike.${searchPattern},name.ilike.${searchPattern}`);
  }
  queryBuilder = queryBuilder.order('codigo', { ascending: true }).range(offset, offset + pageSize - 1);
  const { data, error, count } = await queryBuilder;
  if (error) {
    const localResults = await searchLocalParts(query);
    return { parts: localResults.slice(offset, offset + pageSize) as Part[], totalCount: localResults.length };
  }
  return { parts: data as Part[], totalCount: count || 0 };
};

export const searchParts = async (query: string): Promise<Part[]> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  if (!lowerCaseQuery) return [];
  const searchPattern = `%${lowerCaseQuery.split(/\s+/).filter(Boolean).join('%')}%`;
  const { data, error } = await supabase.from('parts').select('*').or(`codigo.ilike.${searchPattern},descricao.ilike.${searchPattern},name.ilike.${searchPattern},tags.ilike.${searchPattern}`).limit(100);
  if (error) return searchLocalParts(query) as Promise<Part[]>;
  return data as Part[];
};

export const getParts = async (): Promise<Part[]> => {
  const localParts = await getLocalParts();
  if (localParts.length > 0) return localParts as Part[];
  const { data } = await supabase.from('parts').select('*');
  if (data) await bulkPutLocalParts(data);
  return (data || []) as Part[];
};

export const addPart = async (part: Omit<Part, 'id'>): Promise<Part> => {
  const { data, error } = await supabase.from('parts').insert(part).select().single();
  if (error) throw error;
  await bulkPutLocalParts([data]);
  return data;
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  await supabase.from('parts').update({ 
    codigo: updatedPart.codigo, 
    descricao: updatedPart.descricao, 
    tags: updatedPart.tags, 
    name: updatedPart.name, 
    itens_relacionados: updatedPart.itens_relacionados || [] 
  }).eq('id', updatedPart.id);
  await updateLocalPart(updatedPart);
};

export const deletePart = async (id: string): Promise<void> => {
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) throw error;
  await localDb.parts.delete(id);
};

export const importParts = async (newParts: Part[]): Promise<void> => {
  const { error } = await supabase.from('parts').upsert(newParts, { onConflict: 'codigo' });
  if (error) throw error;
  await bulkPutLocalParts(newParts);
};

export const getAllPartsForExport = async (): Promise<Part[]> => {
  const { data, error } = await supabase.from('parts').select('*');
  if (error) throw error;
  return data as Part[];
};

export const cleanupEmptyParts = async (): Promise<number> => {
  const { data, error, count } = await supabase
    .from('parts')
    .delete({ count: 'exact' })
    .or('codigo.eq.,descricao.eq.');
  if (error) throw error;
  return count || 0;
};

export const batchUpdateRelations = async (codes: string[]): Promise<{ updatedCount: number, notFoundCodes: string[] }> => {
  const { data: parts, error } = await supabase.from('parts').select('*').in('codigo', codes);
  if (error) throw error;

  const foundCodes = parts.map(p => p.codigo);
  const notFoundCodes = codes.filter(c => !foundCodes.includes(c));

  for (const part of parts) {
    const otherCodes = foundCodes.filter(c => c !== part.codigo);
    const newRelations: RelatedPart[] = otherCodes.map(c => {
      const otherPart = parts.find(p => p.codigo === c);
      return {
        codigo: c,
        name: otherPart?.name || otherPart?.descricao || c,
        desc: otherPart?.descricao || ''
      };
    });

    const currentRelations = part.itens_relacionados || [];
    const mergedRelations = [...currentRelations];
    newRelations.forEach(nr => {
      if (!mergedRelations.some(cr => cr.codigo === nr.codigo)) {
        mergedRelations.push(nr);
      }
    });

    await updatePart({ ...part, itens_relacionados: mergedRelations });
  }

  return { updatedCount: parts.length, notFoundCodes };
};

// --- AF Management ---

export const getAfsFromService = async (): Promise<Af[]> => {
  const localAfs = await getLocalAfs();
  if (localAfs.length > 0) return localAfs;
  const { data } = await supabase.from('afs').select('*').order('af_number', { ascending: true });
  if (data) await bulkPutLocalAfs(data as Af[]);
  return (data || []) as Af[];
};

export const addAf = async (af: Omit<Af, 'id'>): Promise<Af> => {
  const { data, error } = await supabase.from('afs').insert(af).select().single();
  if (error) throw error;
  await bulkPutLocalAfs([data]);
  return data;
};

export const updateAf = async (af: Af): Promise<void> => {
  const { error } = await supabase.from('afs').update({ af_number: af.af_number, descricao: af.descricao }).eq('id', af.id);
  if (error) throw error;
  await localDb.afs.put(af);
};

export const deleteAf = async (id: string): Promise<void> => {
  const { error } = await supabase.from('afs').delete().eq('id', id);
  if (error) throw error;
  await localDb.afs.delete(id);
};

export const importAfs = async (newAfs: Af[]): Promise<void> => {
  const { error } = await supabase.from('afs').upsert(newAfs, { onConflict: 'af_number' });
  if (error) throw error;
  await bulkPutLocalAfs(newAfs);
};

export const getAllAfsForExport = async (): Promise<Af[]> => {
  const { data, error } = await supabase.from('afs').select('*');
  if (error) throw error;
  return data as Af[];
};

// --- Simple Parts List Management ---

export const getSimplePartsListItems = async (): Promise<SimplePartItem[]> => {
  return await getLocalSimplePartsListItems();
};

export const addSimplePartItem = async (item: Omit<SimplePartItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  return await addLocalSimplePartItem(item, customCreatedAt);
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

// --- Service Order Items Management (Legacy compatibility) ---

export const getServiceOrderItems = async (): Promise<ServiceOrderItem[]> => {
  return await getLocalServiceOrderItems();
};

export const addServiceOrderItem = async (item: Omit<ServiceOrderItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  return await addLocalServiceOrderItem(item, customCreatedAt);
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

// --- Export Utilities ---

export const exportDataAsCsv = (data: any[], fileName: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportDataAsJson = (data: any[], fileName: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Monthly Apontamentos Sync ---

export const syncMonthlyApontamentosFromSupabase = async (userId: string, monthYear: string, forcePull: boolean = false): Promise<MonthlyApontamento | undefined> => {
  const { data, error } = await supabase.from('monthly_apontamentos').select('*').eq('user_id', userId).eq('month_year', monthYear).single();
  if (data) {
    const remoteMonthlyApontamento: MonthlyApontamento = { ...data, data: (data.data as DailyApontamento[]).map(cleanDailyApontamento) };
    await putLocalMonthlyApontamento(remoteMonthlyApontamento);
    return remoteMonthlyApontamento;
  }
  return undefined;
};

export const syncMonthlyApontamentoToSupabase = async (monthlyApontamento: MonthlyApontamento, forcePush: boolean = false): Promise<MonthlyApontamento> => {
  const { error } = await supabase.from('monthly_apontamentos').upsert(monthlyApontamento, { onConflict: 'user_id,month_year' });
  if (error) throw error;
  await putLocalMonthlyApontamento(monthlyApontamento);
  return monthlyApontamento;
};

export const getApontamentos = async (userId: string, monthYear: string): Promise<DailyApontamento[]> => {
  const monthly = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
  return monthly?.data || [];
};

export const updateApontamento = async (userId: string, monthYear: string, dailyApontamento: DailyApontamento): Promise<DailyApontamento> => {
  let current = await getLocalMonthlyApontamento(userId, monthYear) || { id: uuidv4(), user_id: userId, month_year: monthYear, data: [] };
  const updatedData = [...current.data.filter(a => a.date !== dailyApontamento.date), dailyApontamento];
  const updatedMonthly = { ...current, data: updatedData, updated_at: new Date().toISOString() };
  await syncMonthlyApontamentoToSupabase(updatedMonthly);
  return dailyApontamento;
};

export const deleteApontamento = async (userId: string, monthYear: string, dailyApontamentoDate: string): Promise<void> => {
  let current = await getLocalMonthlyApontamento(userId, monthYear);
  if (!current) return;
  const updatedData = current.data.filter(a => a.date !== dailyApontamentoDate);
  await syncMonthlyApontamentoToSupabase({ ...current, data: updatedData, updated_at: new Date().toISOString() });
};

export const deleteApontamentosByMonth = async (userId: string, monthYear: string): Promise<number> => {
  await deleteLocalMonthlyApontamento(userId, monthYear);
  const { count } = await supabase.from('monthly_apontamentos').delete({ count: 'exact' }).eq('user_id', userId).eq('month_year', monthYear);
  return count || 0;
};