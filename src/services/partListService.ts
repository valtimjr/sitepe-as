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
  isOnline,
  getLocalMonthlyApontamento,
  putLocalMonthlyApontamento, 
  deleteLocalMonthlyApontamento,
  getLocalDailyServiceOrder,
  putLocalDailyServiceOrder,
  deleteLocalDailyServiceOrder,
  getLocalSimplePartsListItems,
  addLocalSimplePartItem,
  updateLocalSimplePartItem,
  deleteLocalSimplePartItem,
  clearLocalSimplePartsList,
  getLocalServiceOrderItems,
  addLocalServiceOrderItem,
  updateLocalServiceOrderItem,
  deleteLocalServiceOrderItem,
  clearLocalServiceOrderItems
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';
import { DailyApontamento, MonthlyApontamento, RelatedPart, Part as SupabasePart, DailyServiceOrder, ServiceOrderData, Af as SupabaseAf, ServiceOrderPart } from '@/types/supabase';

// Export types used in other files
export type { SimplePartItem, ServiceOrderItem } from '@/services/localDbService';
export type { ServiceOrderData, Apontamento, MonthlyApontamento } from '@/types/supabase';

export interface Part extends SupabasePart {}
export interface Af extends SupabaseAf {}

// --- Visitor Mode Service Orders (Flat List) ---

export const getVisitorServiceOrders = async (): Promise<ServiceOrderData[]> => {
  const items = await getLocalServiceOrderItems();
  // Map internal ServiceOrderItem to ServiceOrderData for UI consistency
  return items.map(item => ({
    id: item.id,
    af: item.af,
    os: item.os || '',
    hora_inicio: item.hora_inicio || '',
    hora_final: item.hora_final || '',
    servico_executado: item.servico_executado || '',
    parts: item.parts || []
  }));
};

export const saveVisitorServiceOrder = async (os: ServiceOrderData): Promise<void> => {
  const all = await getLocalServiceOrderItems();
  const exists = all.find(item => item.id === os.id);
  
  if (exists) {
    await updateLocalServiceOrderItem({
      ...os,
      created_at: exists.created_at
    });
  } else {
    await addLocalServiceOrderItem({
      ...os,
      created_at: new Date()
    });
  }
};

export const deleteVisitorServiceOrder = async (id: string): Promise<void> => {
  await deleteLocalServiceOrderItem(id);
};

export const clearVisitorServiceOrders = async (): Promise<void> => {
  await clearLocalServiceOrderItems();
};

// --- Service Order Functions (Daily JSON based - Logged Mode) ---

export const getDailyServiceOrders = async (userId: string | undefined, date: string): Promise<ServiceOrderData[]> => {
  if (userId) {
    const { data, error } = await supabase
      .from('daily_service_orders')
      .select('os_list')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('Error fetching SO from Supabase:', error);
      const local = await getLocalDailyServiceOrder(userId, date);
      return local?.os_list || [];
    }
    
    return data?.os_list || [];
  } else {
    const local = await getLocalDailyServiceOrder('guest', date);
    return local?.os_list || [];
  }
};

export const saveDailyServiceOrder = async (userId: string | undefined, date: string, osList: ServiceOrderData[]): Promise<void> => {
  const payload: Partial<DailyServiceOrder> = {
    user_id: userId || 'guest',
    date: date,
    os_list: osList,
    updated_at: new Date().toISOString()
  };

  if (userId) {
    const { error } = await supabase
      .from('daily_service_orders')
      .upsert(payload, { onConflict: 'user_id,date' });

    if (error) throw error;
  }
  
  await putLocalDailyServiceOrder({
    id: uuidv4(),
    user_id: userId || 'guest',
    date: date,
    os_list: osList,
    updated_at: payload.updated_at!,
    user_badge: null,
    user_name: null
  });
};

export const clearDailyServiceOrders = async (userId: string | undefined, date: string): Promise<void> => {
  if (userId) {
    const { error } = await supabase
      .from('daily_service_orders')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);
    
    if (error) throw error;
  }
  
  await deleteLocalDailyServiceOrder(userId || 'guest', date);
};

// --- Simple Parts List (Local Only) ---

export const getSimplePartsListItems = async () => {
  return getLocalSimplePartsListItems();
};

export const addSimplePartItem = async (item: { codigo_peca: string; descricao: string; quantidade: number; af?: string }) => {
  return addLocalSimplePartItem(item);
};

export const updateSimplePartItem = async (item: any) => {
  return updateLocalSimplePartItem(item);
};

export const deleteSimplePartItem = async (id: string) => {
  return deleteLocalSimplePartItem(id);
};

export const clearSimplePartsList = async () => {
  return clearLocalSimplePartsList();
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

export const addPart = async (part: Omit<Part, 'id'>): Promise<void> => {
  const { data, error } = await supabase.from('parts').insert([part]).select().single();
  if (error) throw error;
  if (data) await localDb.parts.add(data);
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  await supabase.from('parts').update({ codigo: updatedPart.codigo, descricao: updatedPart.descricao, tags: updatedPart.tags, name: updatedPart.name, itens_relacionados: updatedPart.itens_relacionados || [] }).eq('id', updatedPart.id);
  await updateLocalPart(updatedPart);
};

export const deletePart = async (id: string): Promise<void> => {
  await supabase.from('parts').delete().eq('id', id);
  await localDb.parts.delete(id);
};

export const getAllPartsForExport = async (): Promise<Part[]> => {
  const { data, error } = await supabase.from('parts').select('*').order('codigo', { ascending: true });
  if (error) throw error;
  return data as Part[];
};

export const batchUpdateRelations = async (codes: string[]): Promise<{ updatedCount: number, notFoundCodes: string[] }> => {
  const { data: foundParts, error } = await supabase.from('parts').select('*').in('codigo', codes);
  if (error) throw error;
  
  const foundCodes = foundParts.map(p => p.codigo);
  const notFoundCodes = codes.filter(c => !foundCodes.includes(c));

  const updates = foundParts.map(part => {
    const others = foundParts
      .filter(p => p.codigo !== part.codigo)
      .map(p => ({
        codigo: p.codigo,
        name: p.name || p.descricao,
        desc: p.descricao
      }));
    
    const existing = part.itens_relacionados || [];
    const combined = [...existing];
    others.forEach(o => {
      if (!combined.some(e => e.codigo === o.codigo)) combined.push(o);
    });

    return { ...part, itens_relacionados: combined };
  });

  await Promise.all(updates.map(u => updatePart(u)));
  return { updatedCount: updates.length, notFoundCodes };
};

// --- AFs Management ---

export const getAfsFromService = async (): Promise<Af[]> => {
  const localAfs = await getLocalAfs();
  if (localAfs.length > 0) return localAfs as Af[];
  const { data } = await supabase.from('afs').select('*').order('af_number', { ascending: true });
  if (data) await bulkPutLocalAfs(data as Af[]);
  return (data || []) as Af[];
};

export const addAf = async (af: Omit<Af, 'id'>): Promise<void> => {
  const { data, error } = await supabase.from('afs').insert([af]).select().single();
  if (error) throw error;
  if (data) await localDb.afs.add(data);
};

export const updateAf = async (af: Af): Promise<void> => {
  const { error } = await supabase.from('afs').update({ af_number: af.af_number, descricao: af.descricao }).eq('id', af.id);
  if (error) throw error;
  await localDb.afs.put(af);
};

export const deleteAf = async (id: string): Promise<void> => {
  await supabase.from('afs').delete().eq('id', id);
  await localDb.afs.delete(id);
};

export const getAllAfsForExport = async (): Promise<Af[]> => {
  const { data, error } = await supabase.from('afs').select('*').order('af_number', { ascending: true });
  if (error) throw error;
  return data as Af[];
};

// --- Sync & Utility ---

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

// --- Time Tracking ---

export const syncMonthlyApontamentosFromSupabase = async (userId: string, monthYear: string, forcePull: boolean = false): Promise<MonthlyApontamento | undefined> => {
  const local = await getLocalMonthlyApontamento(userId, monthYear);
  const { data } = await supabase.from('monthly_apontamentos').select('*').eq('user_id', userId).eq('month_year', monthYear).single();
  if (data) {
    const remote = { ...data, data: data.data as DailyApontamento[] };
    await putLocalMonthlyApontamento(remote);
    return remote;
  }
  return local;
};

export const syncMonthlyApontamentoToSupabase = async (apontamento: MonthlyApontamento, forceSync: boolean = false): Promise<MonthlyApontamento> => {
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

export const getLocalMonthlyApontamentoService = async (userId: string, monthYear: string) => {
  return getLocalMonthlyApontamento(userId, monthYear);
};