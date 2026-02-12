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
  SimplePartItem as LocalSimplePartItem,
  addLocalSimplePartItem,
  getLocalSimplePartsListItems,
  updateLocalSimplePartItem,
  deleteLocalSimplePartItem,
  clearLocalSimplePartsList,
  isOnline,
  getLocalMonthlyApontamento,
  putLocalMonthlyApontamento, 
  deleteLocalMonthlyApontamento,
  getLocalDailyServiceOrder,
  putLocalDailyServiceOrder,
  deleteLocalDailyServiceOrder
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';
import { DailyApontamento, MonthlyApontamento, Part as SupabasePart, DailyServiceOrder, ServiceOrderData, Af as SupabaseAf } from '@/types/supabase';

export interface Part extends SupabasePart {}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface Af extends SupabaseAf {}
export type Apontamento = DailyApontamento;

// Re-exportando a função do banco local com o nome esperado pelo componente
export const getLocalMonthlyApontamentoService = getLocalMonthlyApontamento;

// ID fixo para salvar as OS locais de visitantes
const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";

// --- Daily Service Orders Service ---

export const getDailyServiceOrders = async (userId: string | undefined, date: string): Promise<ServiceOrderData[]> => {
  const online = await isOnline();
  const effectiveUserId = userId || GUEST_USER_ID;

  if (userId && online) {
    const { data, error } = await supabase
      .from('daily_service_orders')
      .select('os_list')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[getDailyServiceOrders] Supabase Error:', error);
    }

    if (data) {
      // Atualiza cache local
      await putLocalDailyServiceOrder({
        id: uuidv4(),
        user_id: userId,
        date,
        user_badge: null,
        user_name: null,
        os_list: data.os_list as ServiceOrderData[]
      });
      return data.os_list as ServiceOrderData[];
    }
  }

  // Fallback para cache local ou modo visitante
  const localData = await getLocalDailyServiceOrder(effectiveUserId, date);
  return localData?.os_list || [];
};

export const saveDailyServiceOrder = async (userId: string | undefined, date: string, osList: ServiceOrderData[]): Promise<void> => {
  const online = await isOnline();
  const effectiveUserId = userId || GUEST_USER_ID;

  const dailyOrder: DailyServiceOrder = {
    id: uuidv4(),
    user_id: effectiveUserId,
    date,
    user_badge: null,
    user_name: null,
    os_list: osList,
    updated_at: new Date().toISOString()
  };

  // 1. Salva localmente (Sempre)
  await putLocalDailyServiceOrder(dailyOrder);

  // 2. Tenta salvar no Supabase se logado
  if (userId && online) {
    const { error } = await supabase
      .from('daily_service_orders')
      .upsert({
        user_id: userId,
        date,
        os_list: osList,
        updated_at: dailyOrder.updated_at
      }, { onConflict: 'user_id,date' });

    if (error) {
      console.error('[saveDailyServiceOrder] Supabase Error:', error);
      throw new Error(`Erro ao salvar no servidor: ${error.message}`);
    }
  }
};

export const clearDailyServiceOrders = async (userId: string | undefined, date: string): Promise<void> => {
  const online = await isOnline();
  const effectiveUserId = userId || GUEST_USER_ID;

  await deleteLocalDailyServiceOrder(effectiveUserId, date);

  if (userId && online) {
    await supabase
      .from('daily_service_orders')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);
  }
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

export const addPart = async (part: Omit<Part, 'id'>): Promise<string> => {
  const newPart = { ...part, id: uuidv4() };
  const { data, error } = await supabase.from('parts').insert(newPart).select();
  if (error) throw error;
  await localDb.parts.add(newPart);
  return data[0].id;
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  await supabase.from('parts').update({ codigo: updatedPart.codigo, descricao: updatedPart.descricao, tags: updatedPart.tags, name: updatedPart.name, itens_relacionados: updatedPart.itens_relacionados || [] }).eq('id', updatedPart.id);
  await updateLocalPart(updatedPart);
};

export const deletePart = async (id: string): Promise<void> => {
  await supabase.from('parts').delete().eq('id', id);
  await localDb.parts.delete(id);
};

// --- AFs Management ---

export const getAfsFromService = async (): Promise<Af[]> => {
  const localAfs = await getLocalAfs();
  if (localAfs.length > 0) return localAfs as Af[];
  const { data } = await supabase.from('afs').select('*').order('af_number', { ascending: true });
  if (data) await bulkPutLocalAfs(data as Af[]);
  return (data || []) as Af[];
};

export const addAf = async (af: Omit<Af, 'id'>): Promise<string> => {
  const newAf = { ...af, id: uuidv4() };
  const { data, error } = await supabase.from('afs').insert(newAf).select();
  if (error) throw error;
  await localDb.afs.add(newAf);
  return data[0].id;
};

export const updateAf = async (updatedAf: Af): Promise<void> => {
  await supabase.from('afs').update({ af_number: updatedAf.af_number, descricao: updatedAf.descricao }).eq('id', updatedAf.id);
  await localDb.afs.update(updatedAf.id, updatedAf);
};

export const deleteAf = async (id: string): Promise<void> => {
  await supabase.from('afs').delete().eq('id', id);
  await localDb.afs.delete(id);
};

export const getAllAfsForExport = async (): Promise<Af[]> => {
  const { data, error } = await supabase.from('afs').select('*');
  if (error) throw error;
  return data as Af[];
};

export const getAllPartsForExport = async (): Promise<Part[]> => {
  const { data, error } = await supabase.from('parts').select('*');
  if (error) throw error;
  return data as Part[];
};

// --- Utilities ---

export const importParts = async (parts: Part[]): Promise<void> => {
  await supabase.from('parts').upsert(parts, { onConflict: 'id' });
  await bulkPutLocalParts(parts);
};

export const importAfs = async (afs: Af[]): Promise<void> => {
  await supabase.from('afs').upsert(afs, { onConflict: 'af_number' });
  await bulkPutLocalAfs(afs as Af[]);
};

export const exportDataAsCsv = (data: any[], filename: string): void => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  }
};

export const exportDataAsJson = (data: any[], filename: string): void => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  }
};

export const cleanupEmptyParts = async (): Promise<number> => {
  const { data } = await supabase.from('parts').select('id').or('codigo.eq.,descricao.eq.');
  if (data && data.length > 0) {
    const ids = data.map(p => p.id);
    await supabase.from('parts').delete().in('id', ids);
    await localDb.parts.bulkDelete(ids);
    return ids.length;
  }
  return 0;
};

export const batchUpdateRelations = async (codes: string[]): Promise<{ updatedCount: number, notFoundCodes: string[] }> => {
  const { data } = await supabase.from('parts').select('*').in('codigo', codes);
  if (!data) return { updatedCount: 0, notFoundCodes: codes };
  const updatedCount = data.length;
  const notFoundCodes = codes.filter(c => !data.find(p => p.codigo === c));
  return { updatedCount, notFoundCodes };
};

// --- Simple Parts List ---

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

// --- Apontamentos ---

export const syncMonthlyApontamentosFromSupabase = async (userId: string, monthYear: string, forcePull: boolean = false): Promise<MonthlyApontamento | undefined> => {
  const { data } = await supabase.from('monthly_apontamentos').select('*').eq('user_id', userId).eq('month_year', monthYear).single();
  if (data) {
    const remote = data as MonthlyApontamento;
    await putLocalMonthlyApontamento(remote);
    return remote;
  }
  return await getLocalMonthlyApontamento(userId, monthYear);
};

export const syncMonthlyApontamentoToSupabase = async (apontamento: MonthlyApontamento): Promise<MonthlyApontamento> => {
  await supabase.from('monthly_apontamentos').upsert(apontamento, { onConflict: 'user_id,month_year' });
  await putLocalMonthlyApontamento(apontamento);
  return apontamento;
};

export const getApontamentos = async (userId: string, monthYear: string): Promise<DailyApontamento[]> => {
  const monthly = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
  return monthly?.data || [];
};

export const updateApontamento = async (userId: string, monthYear: string, daily: DailyApontamento): Promise<DailyApontamento> => {
  let current = await getLocalMonthlyApontamento(userId, monthYear) || { id: uuidv4(), user_id: userId, month_year: monthYear, data: [] };
  const updatedData = [...current.data.filter(a => a.date !== daily.date), daily];
  const updatedMonthly = { ...current, data: updatedData, updated_at: new Date().toISOString() };
  await syncMonthlyApontamentoToSupabase(updatedMonthly);
  return daily;
};

export const deleteApontamento = async (userId: string, monthYear: string, date: string): Promise<void> => {
  let current = await getLocalMonthlyApontamento(userId, monthYear);
  if (!current) return;
  const updatedData = current.data.filter(a => a.date !== date);
  await syncMonthlyApontamentoToSupabase({ ...current, data: updatedData, updated_at: new Date().toISOString() });
};

export const deleteApontamentosByMonth = async (userId: string, monthYear: string): Promise<number> => {
  await deleteLocalMonthlyApontamento(userId, monthYear);
  const { count } = await supabase.from('monthly_apontamentos').delete({ count: 'exact' }).eq('user_id', userId).eq('month_year', monthYear);
  return count || 0;
};