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
  clearLocalServiceOrderItems,
  Part as LocalPart,
  Af as LocalAf
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';
import { DailyApontamento, MonthlyApontamento, RelatedPart, Part as SupabasePart, DailyServiceOrder, ServiceOrderData, Af as SupabaseAf, ServiceOrderPart } from '@/types/supabase';
import { CompanyType } from '@/types/company';
import {
  getListsData,
  getActiveList,
  addItemToActiveList,
  updateItemInActiveList,
  deleteItemFromActiveList,
  clearActiveList
} from '@/services/localListStorage';

// Export types used in other files
export type { SimplePartItem, ServiceOrderItem } from '@/services/localDbService';
export type { ServiceOrderData, DailyApontamento as Apontamento, MonthlyApontamento } from '@/types/supabase';

export interface Part extends SupabasePart {}
export interface Af extends SupabaseAf {}

// Helper to get table name based on company
const getPartsTable = (company: CompanyType) => company === 'citrosuco' ? 'parts_citrosuco' : 'parts';
const getAfsTable = (company: CompanyType) => company === 'citrosuco' ? 'afs_citrosuco' : 'afs';

// --- Visitor Mode Service Orders (Flat List) ---

export const getVisitorServiceOrders = async (company: CompanyType): Promise<ServiceOrderData[]> => {
  const items = await getLocalServiceOrderItems(company);
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

export const saveVisitorServiceOrder = async (os: ServiceOrderData, company: CompanyType): Promise<void> => {
  const all = await getLocalServiceOrderItems(company);
  const exists = all.find(item => item.id === os.id);
  
  if (exists) {
    await updateLocalServiceOrderItem({
      ...os,
      created_at: exists.created_at,
      company
    });
  } else {
    await addLocalServiceOrderItem({
      ...os,
      created_at: new Date()
    }, company);
  }
};

export const deleteVisitorServiceOrder = async (id: string): Promise<void> => {
  await deleteLocalServiceOrderItem(id);
};

export const clearVisitorServiceOrders = async (company: CompanyType): Promise<void> => {
  await clearLocalServiceOrderItems(company);
};

// --- Service Order Functions (Daily JSON based - Logged Mode) ---

export const getDailyServiceOrders = async (userId: string | undefined, date: string, company: CompanyType): Promise<ServiceOrderData[]> => {
  if (userId) {
    const { data, error } = await supabase
      .from('daily_service_orders')
      .select('os_list')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('company', company)
      .maybeSingle();

    if (error) {
      console.error('Error fetching SO from Supabase:', error);
      const local = await getLocalDailyServiceOrder(userId, date, company);
      return local?.os_list || [];
    }
    
    return data?.os_list || [];
  } else {
    const local = await getLocalDailyServiceOrder('guest', date, company);
    return local?.os_list || [];
  }
};

export const saveDailyServiceOrder = async (userId: string | undefined, date: string, osList: ServiceOrderData[], company: CompanyType): Promise<void> => {
  const payload: Partial<DailyServiceOrder> = {
    user_id: userId || 'guest',
    date: date,
    os_list: osList,
    updated_at: new Date().toISOString(),
    company: company
  };

  if (userId) {
    const { error } = await supabase
      .from('daily_service_orders')
      .upsert(payload, { onConflict: 'user_id,date,company' });

    if (error) throw error;
  }
  
  await putLocalDailyServiceOrder({
    id: uuidv4(),
    user_id: userId || 'guest',
    date: date,
    os_list: osList,
    updated_at: payload.updated_at!,
    user_badge: null,
    user_name: null,
    company: company
  });
};

export const clearDailyServiceOrders = async (userId: string | undefined, date: string, company: CompanyType): Promise<void> => {
  if (userId) {
    const { error } = await supabase
      .from('daily_service_orders')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
      .eq('company', company);
    
    if (error) throw error;
  }
  
  await deleteLocalDailyServiceOrder(userId || 'guest', date, company);
};

// --- Simple Parts List (Local Only) ---

export const getSimplePartsListItems = async (company: CompanyType) => {
  const activeList = await getActiveList(company);
  return activeList.items;
};

export const addSimplePartItem = async (item: { codigo_peca: string; descricao: string; quantidade: number; af?: string }, company: CompanyType) => {
  return addItemToActiveList(company, item);
};

export const updateSimplePartItem = async (item: any) => {
  const company = item.company || 'usina_vale';
  return updateItemInActiveList(company, item);
};

export const deleteSimplePartItem = async (id: string) => {
  const companies: CompanyType[] = ['usina_vale', 'citrosuco'];
  for (const company of companies) {
    const data = await getListsData(company);
    const activeList = data.lists.find(l => l.id === data.activeListId);
    if (activeList) {
      const index = activeList.items.findIndex(item => item.id === id);
      if (index !== -1) {
        await deleteItemFromActiveList(company, id);
        return;
      }
    }
  }
};

export const clearSimplePartsList = async (company: CompanyType) => {
  return clearActiveList(company);
};

// --- Parts Management ---

const sortPartsByPriority = (parts: Part[], query: string): Part[] => {
  if (!query) return parts;
  
  const getScore = (part: Part): number => {
    const lowerQuery = query.toLowerCase().trim();
    const partTags = (part.tags || '').toLowerCase();
    const partCode = (part.codigo || '').toLowerCase().trim();
    const partName = (part.name || '').toLowerCase();
    const partDesc = (part.descricao || '').toLowerCase();

    // 1- tag
    if (partTags && partTags.includes(lowerQuery)) {
      return 1;
    }

    // 2- código (somente se o número do código for exatamente igual)
    if (partCode === lowerQuery) {
      return 2;
    }

    // 3- Nome
    if (partName && partName.includes(lowerQuery)) {
      return 3;
    }

    // 4- Descrição
    if (partDesc && partDesc.includes(lowerQuery)) {
      return 4;
    }

    // 5- Código (caso o número não seja exatamente igual, mas contém o termo)
    if (partCode && partCode.includes(lowerQuery)) {
      return 5;
    }

    return 10;
  };

  return [...parts].sort((a, b) => {
    const scoreA = getScore(a);
    const scoreB = getScore(b);
    
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    
    return a.codigo.localeCompare(b.codigo);
  });
};

export const searchPartsPaginated = async (query: string, company: CompanyType, page: number = 1, pageSize: number = 50): Promise<{ parts: Part[], totalCount: number }> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  const offset = (page - 1) * pageSize;
  const tableName = getPartsTable(company);
  let queryBuilder = supabase.from(tableName).select('*', { count: 'exact' });
  if (lowerCaseQuery) {
    const searchPattern = `%${lowerCaseQuery.split(/\s+/).filter(Boolean).join('%')}%`;
    queryBuilder = queryBuilder.or(`codigo.ilike.${searchPattern},descricao.ilike.${searchPattern},tags.ilike.${searchPattern},name.ilike.${searchPattern}`);
  }
  queryBuilder = queryBuilder.order('codigo', { ascending: true }).range(offset, offset + pageSize - 1);
  const { data, error, count } = await queryBuilder;
  if (error) {
    const localResults = await searchLocalParts(query, company);
    const sortedLocal = sortPartsByPriority(localResults as Part[], query);
    return { parts: sortedLocal.slice(offset, offset + pageSize) as Part[], totalCount: sortedLocal.length };
  }
  const sortedData = sortPartsByPriority(data as Part[], query);
  return { parts: sortedData, totalCount: count || 0 };
};

export const searchParts = async (query: string, company: CompanyType): Promise<Part[]> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  if (!lowerCaseQuery) return [];
  const searchPattern = `%${lowerCaseQuery.split(/\s+/).filter(Boolean).join('%')}%`;
  const tableName = getPartsTable(company);
  const { data, error } = await supabase.from(tableName).select('*').or(`codigo.ilike.${searchPattern},descricao.ilike.${searchPattern},name.ilike.${searchPattern},tags.ilike.${searchPattern}`).limit(100);
  if (error) {
    const localResults = await searchLocalParts(query, company);
    return sortPartsByPriority(localResults as Part[], query);
  }
  return sortPartsByPriority(data as Part[], query);
};

export const getFrequentPartsForProfession = async (professionCode: number, company: CompanyType): Promise<Part[]> => {
  try {
    const { data: freqData, error: freqError } = await supabase
      .from('profession_frequent_parts')
      .select('part_code')
      .eq('profession_code', professionCode)
      .eq('company', company);
      
    if (freqError || !freqData || freqData.length === 0) return [];
    const codes = freqData.map(item => item.part_code);
    
    const tableName = getPartsTable(company);
    const { data: partsData, error: partsError } = await supabase
      .from(tableName)
      .select('*')
      .in('codigo', codes);
      
    if (partsError || !partsData) return [];
    
    return partsData as Part[];
  } catch (err) {
    console.error('Error in getFrequentPartsForProfession:', err);
    return [];
  }
};

export const getParts = async (company: CompanyType): Promise<Part[]> => {
  const localParts = await getLocalParts(company);
  if (localParts.length > 0) return localParts as Part[];
  const tableName = getPartsTable(company);
  const { data } = await supabase.from(tableName).select('*');
  if (data) {
    const partsWithCompany = data.map(p => ({ ...p, company }));
    await bulkPutLocalParts(partsWithCompany);
  }
  return (data || []) as Part[];
};

export const addPart = async (part: Omit<Part, 'id'>, company: CompanyType): Promise<void> => {
  const tableName = getPartsTable(company);
  const { data, error } = await supabase.from(tableName).insert([part]).select().single();
  if (error) throw error;
  if (data) await localDb.parts.add({ ...data, company });
};

export const updatePart = async (updatedPart: Part, company: CompanyType): Promise<void> => {
  const tableName = getPartsTable(company);
  await supabase.from(tableName).update({ codigo: updatedPart.codigo, descricao: updatedPart.descricao, tags: updatedPart.tags, name: updatedPart.name, itens_relacionados: updatedPart.itens_relacionados || [] }).eq('id', updatedPart.id);
  await updateLocalPart({ ...updatedPart, company });
};

export const deletePart = async (id: string, company: CompanyType): Promise<void> => {
  const tableName = getPartsTable(company);
  await supabase.from(tableName).delete().eq('id', id);
  await localDb.parts.delete(id);
};

export const getAllPartsForExport = async (company: CompanyType): Promise<Part[]> => {
  const tableName = getPartsTable(company);
  const { data, error } = await supabase.from(tableName).select('*').order('codigo', { ascending: true });
  if (error) throw error;
  return data as Part[];
};

export const batchUpdateRelations = async (codes: string[], company: CompanyType): Promise<{ updatedCount: number, notFoundCodes: string[] }> => {
  const tableName = getPartsTable(company);
  const { data: foundParts, error } = await supabase.from(tableName).select('*').in('codigo', codes);
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

  await Promise.all(updates.map(u => updatePart(u, company)));
  return { updatedCount: updates.length, notFoundCodes };
};

// --- AFs Management ---

export const getAfsFromService = async (company: CompanyType): Promise<Af[]> => {
  const localAfs = await getLocalAfs(company);
  if (localAfs.length > 0) return localAfs as Af[];
  const tableName = getAfsTable(company);
  const { data } = await supabase.from(tableName).select('*').order('af_number', { ascending: true });
  if (data) {
    const afsWithCompany = data.map(a => ({ ...a, company }));
    await bulkPutLocalAfs(afsWithCompany as LocalAf[]);
  }
  return (data || []) as Af[];
};

export const addAf = async (af: Omit<Af, 'id'>, company: CompanyType): Promise<void> => {
  const tableName = getAfsTable(company);
  const { data, error } = await supabase.from(tableName).insert([af]).select().single();
  if (error) throw error;
  if (data) await localDb.afs.add({ ...data, company });
};

export const updateAf = async (af: Af, company: CompanyType): Promise<void> => {
  const tableName = getAfsTable(company);
  const { error } = await supabase.from(tableName).update({ af_number: af.af_number, descricao: af.descricao }).eq('id', af.id);
  if (error) throw error;
  await localDb.afs.put({ ...af, company });
};

export const deleteAf = async (id: string, company: CompanyType): Promise<void> => {
  const tableName = getAfsTable(company);
  await supabase.from(tableName).delete().eq('id', id);
  await localDb.afs.delete(id);
};

export const getAllAfsForExport = async (company: CompanyType): Promise<Af[]> => {
  const tableName = getAfsTable(company);
  const { data, error } = await supabase.from(tableName).select('*').order('af_number', { ascending: true });
  if (error) throw error;
  return data as Af[];
};

// --- Sync & Utility ---

export const importParts = async (parts: Part[], company: CompanyType): Promise<void> => {
  const tableName = getPartsTable(company);
  await supabase.from(tableName).upsert(parts, { onConflict: 'id' });
  const partsWithCompany = parts.map(p => ({ ...p, company }));
  await bulkPutLocalParts(partsWithCompany);
};

export const importAfs = async (afs: Af[], company: CompanyType): Promise<void> => {
  const tableName = getAfsTable(company);
  await supabase.from(tableName).upsert(afs, { onConflict: 'af_number' });
  const afsWithCompany = afs.map(a => ({ ...a, company }));
  await bulkPutLocalAfs(afsWithCompany as LocalAf[]);
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

export const cleanupEmptyParts = async (company: CompanyType): Promise<number> => {
  const tableName = getPartsTable(company);
  const { data } = await supabase.from(tableName).select('id').or('codigo.eq.,descricao.eq.');
  if (data && data.length > 0) {
    const ids = data.map(p => p.id);
    await supabase.from(tableName).delete().in('id', ids);
    await localDb.parts.bulkDelete(ids);
    return ids.length;
  }
  return 0;
};

// --- Time Tracking ---

export const syncMonthlyApontamentosFromSupabase = async (userId: string, monthYear: string, company: CompanyType, forcePull: boolean = false): Promise<MonthlyApontamento | undefined> => {
  const local = await getLocalMonthlyApontamento(userId, monthYear, company);
  const { data } = await supabase.from('monthly_apontamentos').select('*').eq('user_id', userId).eq('month_year', monthYear).eq('company', company).single();
  if (data) {
    const remote = { ...data, data: data.data as DailyApontamento[] };
    await putLocalMonthlyApontamento(remote);
    return remote;
  }
  return local;
};

export const syncMonthlyApontamentoToSupabase = async (apontamento: MonthlyApontamento, forceSync: boolean = false): Promise<MonthlyApontamento> => {
  await supabase.from('monthly_apontamentos').upsert(apontamento, { onConflict: 'user_id,month_year,company' });
  await putLocalMonthlyApontamento(apontamento);
  return apontamento;
};

export const getApontamentos = async (userId: string, monthYear: string, company: CompanyType): Promise<DailyApontamento[]> => {
  const monthly = await syncMonthlyApontamentosFromSupabase(userId, monthYear, company);
  return monthly?.data || [];
};

export const updateApontamento = async (userId: string, monthYear: string, daily: DailyApontamento, company: CompanyType): Promise<DailyApontamento> => {
  let current = await getLocalMonthlyApontamento(userId, monthYear, company) || { id: uuidv4(), user_id: userId, month_year: monthYear, data: [], company };
  const updatedData = [...current.data.filter(a => a.date !== daily.date), daily];
  const updatedMonthly = { ...current, data: updatedData, updated_at: new Date().toISOString(), company };
  await syncMonthlyApontamentoToSupabase(updatedMonthly);
  return daily;
};

export const deleteApontamento = async (userId: string, monthYear: string, date: string, company: CompanyType): Promise<void> => {
  let current = await getLocalMonthlyApontamento(userId, monthYear, company);
  if (!current) return;
  const updatedData = current.data.filter(a => a.date !== date);
  await syncMonthlyApontamentoToSupabase({ ...current, data: updatedData, updated_at: new Date().toISOString(), company });
};

export const deleteApontamentosByMonth = async (userId: string, monthYear: string, company: CompanyType): Promise<number> => {
  await deleteLocalMonthlyApontamento(userId, monthYear, company);
  const { count } = await supabase.from('monthly_apontamentos').delete({ count: 'exact' }).eq('user_id', userId).eq('month_year', monthYear).eq('company', company);
  return count || 0;
};

export const getLocalMonthlyApontamentoService = async (userId: string, monthYear: string, company: CompanyType) => {
  return getLocalMonthlyApontamento(userId, monthYear, company);
};

// --- Favorite Parts ---

export const getFavoriteParts = async (userId: string | undefined, company: CompanyType): Promise<Part[]> => {
  try {
    let codes: string[] = [];
    if (userId) {
      const { data, error } = await supabase
        .from('user_favorite_parts')
        .select('part_codes')
        .eq('user_id', userId)
        .eq('company', company)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching favorites from database, falling back to localStorage:', error);
        const cached = localStorage.getItem(`autoboard_favorite_parts_${company}_${userId}`);
        codes = cached ? JSON.parse(cached) : [];
      } else {
        codes = data?.part_codes ? (data.part_codes as string[]) : [];
        // cache in localStorage
        localStorage.setItem(`autoboard_favorite_parts_${company}_${userId}`, JSON.stringify(codes));
      }
    } else {
      const cached = localStorage.getItem(`autoboard_favorite_parts_${company}_guest`);
      codes = cached ? JSON.parse(cached) : [];
    }
    
    if (codes.length === 0) return [];
    
    const tableName = getPartsTable(company);
    const { data: partsData, error: partsError } = await supabase
      .from(tableName)
      .select('*')
      .in('codigo', codes);
      
    if (partsError || !partsData) {
      const localParts = await getParts(company);
      return localParts.filter(p => codes.includes(p.codigo));
    }
    
    return partsData as Part[];
  } catch (err) {
    console.error('Error in getFavoriteParts:', err);
    return [];
  }
};

export const addFavoritePart = async (userId: string | undefined, company: CompanyType, partCode: string): Promise<void> => {
  try {
    if (userId) {
      const { data, error: fetchError } = await supabase
        .from('user_favorite_parts')
        .select('part_codes')
        .eq('user_id', userId)
        .eq('company', company)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let currentCodes: string[] = data?.part_codes ? (data.part_codes as string[]) : [];
      if (!currentCodes.includes(partCode)) {
        currentCodes.push(partCode);
        
        const { error: upsertError } = await supabase
          .from('user_favorite_parts')
          .upsert({
            user_id: userId,
            company,
            part_codes: currentCodes,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,company' });

        if (upsertError) throw upsertError;
      }
      
      const cached = localStorage.getItem(`autoboard_favorite_parts_${company}_${userId}`);
      const codes = cached ? JSON.parse(cached) : [];
      if (!codes.includes(partCode)) {
        codes.push(partCode);
        localStorage.setItem(`autoboard_favorite_parts_${company}_${userId}`, JSON.stringify(codes));
      }
    } else {
      const cached = localStorage.getItem(`autoboard_favorite_parts_${company}_guest`);
      const codes = cached ? JSON.parse(cached) : [];
      if (!codes.includes(partCode)) {
        codes.push(partCode);
        localStorage.setItem(`autoboard_favorite_parts_${company}_guest`, JSON.stringify(codes));
      }
    }
  } catch (err) {
    console.error('Error in addFavoritePart:', err);
  }
};

export const removeFavoritePart = async (userId: string | undefined, company: CompanyType, partCode: string): Promise<void> => {
  try {
    if (userId) {
      const { data, error: fetchError } = await supabase
        .from('user_favorite_parts')
        .select('part_codes')
        .eq('user_id', userId)
        .eq('company', company)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let currentCodes: string[] = data?.part_codes ? (data.part_codes as string[]) : [];
      if (currentCodes.includes(partCode)) {
        currentCodes = currentCodes.filter((c: string) => c !== partCode);
        
        const { error: upsertError } = await supabase
          .from('user_favorite_parts')
          .upsert({
            user_id: userId,
            company,
            part_codes: currentCodes,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,company' });

        if (upsertError) throw upsertError;
      }
      
      const cached = localStorage.getItem(`autoboard_favorite_parts_${company}_${userId}`);
      let codes = cached ? JSON.parse(cached) : [];
      codes = codes.filter((c: string) => c !== partCode);
      localStorage.setItem(`autoboard_favorite_parts_${company}_${userId}`, JSON.stringify(codes));
    } else {
      const cached = localStorage.getItem(`autoboard_favorite_parts_${company}_guest`);
      let codes = cached ? JSON.parse(cached) : [];
      codes = codes.filter((c: string) => c !== partCode);
      localStorage.setItem(`autoboard_favorite_parts_${company}_guest`, JSON.stringify(codes));
    }
  } catch (err) {
    console.error('Error in removeFavoritePart:', err);
  }
};

