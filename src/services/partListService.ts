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
  getLocalMonthlyApontamento, // Importar novas funções para monthlyApontamentos
  putLocalMonthlyApontamento,
  bulkPutLocalMonthlyApontamentos,
  clearLocalMonthlyApontamentos,
  deleteLocalMonthlyApontamento,
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';
import { Network } from '@capacitor/network'; // Importar Network
import { format } from 'date-fns';
import { DailyApontamento, MonthlyApontamento } from '@/types/supabase'; // Importar novos tipos

export interface Part extends LocalPart {
  name?: string; // Adicionado o campo 'name'
}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface ServiceOrderItem extends LocalServiceOrderItem {}
export interface Af extends LocalAf {}
export type Apontamento = DailyApontamento; // Apontamento agora é o DailyApontamento

// Helper para garantir que DailyApontamento objetos não contenham um campo 'id' ou 'user_id'
const cleanDailyApontamento = (ap: DailyApontamento): DailyApontamento => {
  const { id, user_id, ...rest } = ap as any; // Converte para any para desestruturar 'id' e 'user_id' com segurança, se existirem
  return rest;
};

const seedPartsFromJson = async (): Promise<void> => {
  // Primeiro, verifica se há peças no Supabase
  const { count: supabasePartsCount, error: countError } = await supabase
    .from('parts')
    .select('*', { count: 'exact' });

  if (countError) {
    console.error('Error checking Supabase parts count:', countError);
    // Fallback para IndexedDB para verificar se já há dados localmente
    const localPartsCount = await localDb.parts.count();
    if (localPartsCount > 0) {
      return;
    }
  }

  if (supabasePartsCount && supabasePartsCount > 0) {
    return;
  }

  try {
    const response = await fetch('/data/parts.json'); // Caminho atualizado
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const parsedParts: Part[] = await response.json();

    // Adiciona ao Supabase
    const { error: insertError } = await supabase
      .from('parts')
      .insert(parsedParts);

    if (insertError) {
      console.error('Failed to seed parts to Supabase:', insertError);
      throw insertError;
    }

    // Também adiciona ao IndexedDB para cache local
    await bulkPutLocalParts(parsedParts);

  } catch (error) {
    console.error("Failed to fetch or parse parts.json or seed Supabase/IndexedDB:", error);
  }
};

const seedAfs = async (): Promise<void> => {
  // 1. Primeiro, verifica se há AFs no Supabase
  const { count: supabaseAfsCount, error: countError } = await supabase
    .from('afs')
    .select('*', { count: 'exact' });

  if (countError) {
    console.error('seedAfs: Error checking Supabase AFs count:', countError);
    // Se houver erro ao contar, tenta carregar do IndexedDB como fallback
    const localAfsCount = await localDb.afs.count();
    if (localAfsCount > 0) {
      return;
    }
  }

  if (supabaseAfsCount && supabaseAfsCount > 0) {
    return;
  }

  let parsedAfs: Af[] = [];
  let source = '';

  // 2. Tenta carregar do public/data/afs.json
  try {
    const response = await fetch('/data/afs.json'); // Caminho atualizado
    if (!response.ok) {
      console.warn('seedAfs: Failed to fetch afs.json, trying CSV. Status:', response.status);
    } else {
      parsedAfs = await response.json();
      source = 'JSON';
    }
  } catch (jsonError) {
    console.warn('seedAfs: Error fetching afs.json, trying CSV:', jsonError);
  }

  // 3. Se JSON falhou ou estava vazio, tenta carregar do public/afs.csv
  if (parsedAfs.length === 0) {
    try {
      const response = await fetch('/afs.csv');
      if (response.ok) {
        const csvText = await response.text();
        await new Promise<void>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              parsedAfs = results.data.map((row: any) => ({
                id: row.id || uuidv4(),
                af_number: row.af_number || row.codigo || row.AF, // Suporte a 'codigo' ou 'AF'
                descricao: row.descricao || row.description || '', // Suporte a 'descricao' ou 'description'
              })).filter(af => af.af_number);
              source = 'CSV';
              resolve();
            },
            error: (error: Error) => {
              reject(error);
            }
          });
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (csvError) {
      console.error("seedAfs: Failed to fetch or parse afs.csv:", csvError);
    }
  }

  // 4. Se dados foram encontrados, adiciona ao Supabase e IndexedDB
  if (parsedAfs.length > 0) {
    try {
      const { error: upsertError } = await supabase
        .from('afs')
        .upsert(parsedAfs, { onConflict: 'af_number' }); // ALTERADO: Usando af_number como chave de conflito

      if (upsertError) {
        console.error('seedAfs: Failed to upsert AFs to Supabase:', upsertError);
        throw upsertError;
      }

      await bulkPutLocalAfs(parsedAfs);
    } catch (dbError) {
      console.error("seedAfs: Failed to seed Supabase/IndexedDB with AFs:", dbError);
    }
  } else {
    console.warn('seedAfs: No AFs found in JSON or CSV to seed.');
  }
};

export const getParts = async (query?: string): Promise<Part[]> => {
  await seedPartsFromJson(); // Garante que o Supabase esteja populado

  let queryBuilder = supabase
    .from('parts')
    .select('*')
    .limit(1000); // Limite de 1000 para exibição

  if (query) {
    const lowerCaseQuery = query.toLowerCase().trim();
    const searchPattern = lowerCaseQuery.split(/\s+/).filter(Boolean).join('%');
    queryBuilder = queryBuilder.or(
      `codigo.ilike.%${searchPattern}%,descricao.ilike.%${searchPattern}%,tags.ilike.%${searchPattern}%,name.ilike.%${searchPattern}%`
    );
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error fetching parts from Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    return getLocalParts();
  }

  // Atualiza o cache local com os dados do Supabase
  await localDb.parts.clear();
  await bulkPutLocalParts(data as Part[]);
  return data as Part[];
};

export const getAllPartsForExport = async (): Promise<Part[]> => {
  let allData: Part[] = [];
  const pageSize = 1000; // Define o tamanho da página
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .range(offset, offset + pageSize - 1); // Busca um intervalo de registros

    if (error) {
      console.error('Error fetching all parts for export from Supabase (paginated):', error);
      throw new Error(`Erro ao buscar todas as peças para exportação: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as Part[]);
      offset += pageSize;
    } else {
      hasMore = false; // Não há mais dados para buscar
    }
  }
  return allData;
};

export const addPart = async (part: Omit<Part, 'id'>): Promise<string> => {
  const newPart = { ...part, id: uuidv4() }; // Gera um ID para o Supabase
  const { data, error } = await supabase
    .from('parts')
    .insert(newPart)
    .select();

  if (error) {
    console.error('Error adding part to Supabase:', error);
    throw new Error(`Erro ao adicionar peça no Supabase: ${error.message}`);
  }

  // Adiciona ao IndexedDB também
  await localDb.parts.add(newPart);
  return data[0].id;
};

export const searchParts = async (query: string): Promise<Part[]> => {
  await seedPartsFromJson(); // Garante que o Supabase esteja populado

  const lowerCaseQuery = query.toLowerCase().trim();

  let queryBuilder = supabase
    .from('parts')
    .select('*')
    .limit(1000); // Limite de 1000 para exibição

  if (lowerCaseQuery) {
    // Divide a query em palavras, filtra strings vazias e junta com '%' para buscar em sequência
    const searchPattern = lowerCaseQuery.split(/\s+/).filter(Boolean).join('%');
    
    // Usa o padrão construído para busca 'ilike' nos campos relevantes
    queryBuilder = queryBuilder.or(
      `codigo.ilike.%${searchPattern}%,descricao.ilike.%${searchPattern}%,tags.ilike.%${searchPattern}%,name.ilike.%${searchPattern}%`
    );
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching parts in Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    return searchLocalParts(query); // Passa a query original para a busca local
  }

  let results = data as Part[];

  // Helper para determinar a qualidade da correspondência em um campo
  const getFieldMatchScore = (fieldValue: string | undefined, query: string, regex: RegExp, isMultiWord: boolean): number => {
    if (!fieldValue) return 0;
    const lowerFieldValue = fieldValue.toLowerCase();

    if (isMultiWord) {
      return regex.test(lowerFieldValue) ? 1 : 0; // Apenas verifica se a sequência existe
    } else { // Query de palavra única
      if (lowerFieldValue === query) return 3; // Correspondência exata
      if (lowerFieldValue.startsWith(query)) return 2; // Começa com
      if (lowerFieldValue.includes(query)) return 1; // Inclui
    }
    return 0;
  };

  if (lowerCaseQuery) { // Apenas ordena se houver uma query
    const queryWords = lowerCaseQuery.split(/\s+/).filter(Boolean);
    const isMultiWordQuery = queryWords.length > 1;
    // Cria regex para pontuação no lado do cliente, similar ao localDbService
    const escapedWords = queryWords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexPattern = new RegExp(escapedWords.join('.*'), 'i');

    results.sort((a, b) => {
      const aNameScore = getFieldMatchScore(a.name, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const aTagsScore = getFieldMatchScore(a.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const aCodigoScore = getFieldMatchScore(a.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const aDescricaoScore = getFieldMatchScore(a.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);

      const bNameScore = getFieldMatchScore(b.name, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const bTagsScore = getFieldMatchScore(b.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const bCodigoScore = getFieldMatchScore(b.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const bDescricaoScore = getFieldMatchScore(b.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);

      // Prioriza nome
      if (aNameScore !== bNameScore) return bNameScore - aNameScore;
      // Depois tags
      if (aTagsScore !== bTagsScore) return bTagsScore - aTagsScore;
      // Depois código
      if (aCodigoScore !== bCodigoScore) return bCodigoScore - aCodigoScore;
      // Por último descrição
      if (aDescricaoScore !== bDescricaoScore) return bDescricaoScore - aDescricaoScore;

      return 0;
    });
  }

  return results;
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  // Atualiza no Supabase
  const { error: supabaseError } = await supabase
    .from('parts')
    .update({ codigo: updatedPart.codigo, descricao: updatedPart.descricao, tags: updatedPart.tags, name: updatedPart.name })
    .eq('id', updatedPart.id);

  if (supabaseError) {
    console.error('Error updating part in Supabase:', supabaseError);
    throw new Error(`Erro ao atualizar a peça no Supabase: ${supabaseError.message}`);
  }

  // Atualiza no IndexedDB
  await updateLocalPart(updatedPart);
};

export const deletePart = async (id: string): Promise<void> => {
  // Deleta no Supabase
  const { error: supabaseError } = await supabase
    .from('parts')
    .delete()
    .eq('id', id);

  if (supabaseError) {
    console.error('Error deleting part from Supabase:', supabaseError);
    throw new Error(`Erro ao excluir peça do Supabase: ${supabaseError.message}`);
  }

  // Deleta no IndexedDB
  await localDb.parts.delete(id);
};

// --- Funções para AFs ---
export const getAfsFromService = async (): Promise<Af[]> => {
  await seedAfs(); // Garante que o Supabase esteja populado

  const { data, error } = await supabase
    .from('afs')
    .select('*')
    .order('af_number', { ascending: true }) // Ordena por número de AF
    .limit(1000); // Limite de 1000 para exibição

  if (error) {
    console.error('Error fetching AFs from Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    return getLocalAfs();
  }

  // Atualiza o cache local com os dados do Supabase
  await localDb.afs.clear();
  await bulkPutLocalAfs(data as Af[]);
  return data as Af[];
};

export const getAllAfsForExport = async (): Promise<Af[]> => {
  let allData: Af[] = [];
  const pageSize = 1000; // Define o tamanho da página
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('afs')
      .select('*')
      .range(offset, offset + pageSize - 1); // Busca um intervalo de registros

    if (error) {
      console.error('Error fetching all AFs for export from Supabase (paginated):', error);
      throw new Error(`Erro ao buscar todos os AFs para exportação: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as Af[]);
      offset += pageSize;
    } else {
      hasMore = false; // Não há mais dados para buscar
    }
  }
  return allData;
};

export const addAf = async (af: Omit<Af, 'id'>): Promise<string> => {
  const newAf = { ...af, id: uuidv4() }; // Gera um ID para o Supabase
  const { data, error } = await supabase
    .from('afs')
    .insert(newAf)
    .select();

  if (error) {
    console.error('Error adding AF to Supabase:', error);
    throw new Error(`Erro ao adicionar AF no Supabase: ${error.message}`);
  }

  // Adiciona ao IndexedDB também
  await localDb.afs.add(newAf);
  return data[0].id;
};

export const updateAf = async (updatedAf: Af): Promise<void> => {
  // Atualiza no Supabase
  const { error: supabaseError } = await supabase
    .from('afs')
    .update({ af_number: updatedAf.af_number, descricao: updatedAf.descricao }) // Inclui descricao
    .eq('id', updatedAf.id);

  if (supabaseError) {
    console.error('Error updating AF in Supabase:', supabaseError);
    throw new Error(`Erro ao atualizar AF no Supabase: ${supabaseError.message}`);
  }

  // Atualiza no IndexedDB
  await localDb.afs.update(updatedAf.id, updatedAf);
};

export const deleteAf = async (id: string): Promise<void> => {
  // Deleta no Supabase
  const { error: supabaseError } = await supabase
    .from('afs')
    .delete()
    .eq('id', id);

  if (supabaseError) {
    console.error('Error deleting AF from Supabase:', supabaseError);
    throw new Error(`Erro ao excluir AF do Supabase: ${supabaseError.message}`);
  }

  // Deleta no IndexedDB
  await localDb.afs.delete(id);
};

// --- Funções para SimplePartItem (Lista de Peças Simples) ---
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

// --- Funções para ServiceOrderItem (Lista de Ordens de Serviço) ---
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

export const getLocalUniqueAfs = async (): Promise<string[]> => {
  const afs = await localDb.afs.toArray();
  return afs.map(af => af.af_number).sort();
};

// --- Monthly Apontamentos Management (IndexedDB) ---

export const getLocalMonthlyApontamento = async (userId: string, monthYear: string): Promise<MonthlyApontamento | undefined> => {
  return localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear }).first();
};

export const putLocalMonthlyApontamento = async (monthlyApontamento: MonthlyApontamento): Promise<void> => {
  await localDb.monthlyApontamentos.put(monthlyApontamento);
};

export const bulkPutLocalMonthlyApontamentos = async (monthlyApontamentos: MonthlyApontamento[]): Promise<void> => {
  await localDb.monthlyApontamentos.bulkPut(monthlyApontamentos);
};

export const clearLocalMonthlyApontamentos = async (userId: string): Promise<void> => {
  const idsToDelete = await localDb.monthlyApontamentos.where('user_id').equals(userId).keys();
  await localDb.monthlyApontamentos.bulkDelete(idsToDelete);
};

export const deleteLocalMonthlyApontamento = async (userId: string, monthYear: string): Promise<void> => {
  await localDb.monthlyApontamentos.where({ user_id: userId, month_year: monthYear }).delete();
};

// --- Funções para Apontamentos (Time Tracking) ---

// Helper function to check network status
const isOnline = async () => {
    try {
        const status = await Network.getStatus();
        return status.connected;
    } catch (e) {
        // Fallback for browser environment without Capacitor plugin
        return navigator.onLine;
    }
};

// Sincroniza dados do Supabase para o IndexedDB
export const syncMonthlyApontamentosFromSupabase = async (userId: string, monthYear: string): Promise<MonthlyApontamento | undefined> => {
  console.log(`[syncMonthlyApontamentosFromSupabase] Fetching for user: ${userId}, month: ${monthYear}`);
  const { data, error } = await supabase
    .from('monthly_apontamentos')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
    console.error(`[syncMonthlyApontamentosFromSupabase] Error fetching monthly apontamentos from Supabase for ${monthYear}:`, error);
    return undefined;
  }

  if (data) {
    console.log(`[syncMonthlyApontamentosFromSupabase] Raw data received from Supabase for ${monthYear}:`, data); // NEW LOG
    const monthlyApontamento: MonthlyApontamento = {
      ...data,
      data: (data.data as DailyApontamento[]).map(cleanDailyApontamento), // Limpa IDs e user_id ao buscar
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
    console.log(`[syncMonthlyApontamentosFromSupabase] Cleaned and processed data for local DB for ${monthYear}:`, monthlyApontamento.data); // NEW LOG
    await putLocalMonthlyApontamento(monthlyApontamento);
    console.log(`[syncMonthlyApontamentosFromSupabase] Stored in local DB for ${monthYear}:`, monthlyApontamento);
    return monthlyApontamento;
  }
  console.log(`[syncMonthlyApontamentosFromSupabase] No data found in Supabase for ${monthYear}.`);
  return undefined;
};

// Sincroniza um único objeto MonthlyApontamento para o Supabase
export const syncMonthlyApontamentoToSupabase = async (monthlyApontamento: MonthlyApontamento): Promise<MonthlyApontamento> => {
  const { id, user_id, month_year, data, created_at } = monthlyApontamento;
  
  // Limpa cada entrada diária antes de enviar para o Supabase
  const cleanedData = data.map(cleanDailyApontamento);
  console.log(`[syncMonthlyApontamentoToSupabase] Cleaned daily data before sending to Supabase for ${month_year}:`, cleanedData); // NEW LOG

  const payload = {
    id,
    user_id,
    month_year,
    data: cleanedData, // Usa os dados limpos
    created_at: created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log(`[syncMonthlyApontamentoToSupabase] Sending payload to Supabase for ${month_year}:`, payload);

  const { data: upsertedData, error } = await supabase
    .from('monthly_apontamentos')
    .upsert(payload, { onConflict: 'user_id,month_year' }) // Conflito em user_id e month_year
    .select()
    .single();

  if (error) {
    console.error(`[syncMonthlyApontamentoToSupabase] Error upserting monthly apontamento to Supabase for ${month_year}:`, error);
    throw new Error(`Erro ao sincronizar apontamento mensal: ${error.message}`);
  }

  console.log(`[syncMonthlyApontamentoToSupabase] Received upserted data from Supabase for ${month_year}:`, upsertedData);

  const syncedMonthlyApontamento: MonthlyApontamento = {
    ...upsertedData,
    data: (upsertedData.data as DailyApontamento[]).map(cleanDailyApontamento), // Limpa IDs e user_id ao receber de volta
  };
  console.log(`[syncMonthlyApontamentoToSupabase] Cleaned and processed data for local DB after sync for ${month_year}:`, syncedMonthlyApontamento.data); // NEW LOG

  await putLocalMonthlyApontamento(syncedMonthlyApontamento);
  console.log(`[syncMonthlyApontamentoToSupabase] Stored in local DB after sync for ${month_year}:`, syncedMonthlyApontamento);
  
  return syncedMonthlyApontamento;
};

// Obtém apontamentos diários para um mês específico
export const getApontamentos = async (userId: string, monthYear: string): Promise<DailyApontamento[]> => {
  const online = await isOnline();
  let monthlyApontamento: MonthlyApontamento | undefined;

  if (online) {
    // Tenta sincronizar do Supabase primeiro
    monthlyApontamento = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
  } else {
    // Se offline, tenta do cache local
    console.log(`[getApontamentos] Offline. Fetching from local DB for user: ${userId}, month: ${monthYear}`);
    monthlyApontamento = await getLocalMonthlyApontamento(userId, monthYear);
  }

  return monthlyApontamento?.data || [];
};

// Atualiza um apontamento diário dentro do blob JSON mensal
export const updateApontamento = async (userId: string, monthYear: string, dailyApontamento: DailyApontamento): Promise<DailyApontamento> => {
  const online = await isOnline();
  let currentMonthlyApontamento = await getLocalMonthlyApontamento(userId, monthYear);

  if (!currentMonthlyApontamento) {
    // Se não existe localmente, tenta buscar do Supabase (se online)
    if (online) {
      console.log(`[updateApontamento] No local data. Fetching from Supabase for user: ${userId}, month: ${monthYear}`);
      currentMonthlyApontamento = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
    }
    if (!currentMonthlyApontamento) {
      // Se ainda não existe, cria um novo registro mensal
      console.log(`[updateApontamento] Creating new MonthlyApontamento object for user: ${userId}, month: ${monthYear}`);
      currentMonthlyApontamento = {
        id: uuidv4(), // ID para o registro mensal
        user_id: userId,
        month_year: monthYear,
        data: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  let updatedDailyApontamentos = [...currentMonthlyApontamento.data];
  let newDailyApontamentoToReturn: DailyApontamento;

  // Encontra o apontamento pela data, que agora é o identificador único
  const existingIndexByDate = updatedDailyApontamentos.findIndex(a => a.date === dailyApontamento.date);

  // Garante que o dailyApontamento recebido esteja limpo (sem 'id' e 'user_id')
  const cleanedDailyApontamento = cleanDailyApontamento(dailyApontamento);

  if (existingIndexByDate !== -1) {
    // Se um apontamento para a mesma data existe, atualiza-o
    console.log(`[updateApontamento] Updating existing daily apontamento for date: ${dailyApontamento.date}`);
    newDailyApontamentoToReturn = { ...cleanedDailyApontamento, updated_at: new Date().toISOString() };
    updatedDailyApontamentos[existingIndexByDate] = newDailyApontamentoToReturn;
  } else {
    // Caso contrário, adiciona como uma nova entrada.
    console.log(`[updateApontamento] Adding new daily apontamento for date: ${dailyApontamento.date}`);
    newDailyApontamentoToReturn = { ...cleanedDailyApontamento, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    updatedDailyApontamentos.push(newDailyApontamentoToReturn);
  }

  const updatedMonthlyApontamento: MonthlyApontamento = {
    ...currentMonthlyApontamento,
    data: updatedDailyApontamentos,
    updated_at: new Date().toISOString(),
  };

  console.log(`[updateApontamento] Storing updated MonthlyApontamento locally for ${monthYear}:`, updatedMonthlyApontamento);
  await putLocalMonthlyApontamento(updatedMonthlyApontamento);

  if (online) {
    try {
      console.log(`[updateApontamento] Online. Attempting to sync to Supabase for ${monthYear}.`);
      await syncMonthlyApontamentoToSupabase(updatedMonthlyApontamento);
    } catch (e) {
      console.warn(`[updateApontamento] Immediate Supabase sync of monthly apontamento for ${monthYear} failed, data remains local.`, e);
      // Não relança o erro, pois o dado já está salvo localmente.
    }
  }
  
  return newDailyApontamentoToReturn;
};

// Deleta um apontamento diário dentro do blob JSON mensal
export const deleteApontamento = async (userId: string, monthYear: string, dailyApontamentoDate: string): Promise<void> => {
  const online = await isOnline();
  let currentMonthlyApontamento = await getLocalMonthlyApontamento(userId, monthYear);

  if (!currentMonthlyApontamento) {
    // Se não existe localmente, não há o que deletar
    console.log(`[deleteApontamento] No local MonthlyApontamento found for ${monthYear}. Nothing to delete.`);
    return;
  }

  // Filtra o apontamento pela data
  const updatedDailyApontamentos = currentMonthlyApontamento.data.filter(a => a.date !== dailyApontamentoDate);
  console.log(`[deleteApontamento] Deleting daily apontamento for date: ${dailyApontamentoDate}. Remaining daily entries:`, updatedDailyApontamentos);

  const updatedMonthlyApontamento: MonthlyApontamento = {
    ...currentMonthlyApontamento,
    data: updatedDailyApontamentos,
    updated_at: new Date().toISOString(),
  };

  console.log(`[deleteApontamento] Storing updated MonthlyApontamento locally after deletion for ${monthYear}:`, updatedMonthlyApontamento);
  await putLocalMonthlyApontamento(updatedMonthlyApontamento);

  if (online) {
    try {
      console.log(`[deleteApontamento] Online. Attempting to sync deletion to Supabase for ${monthYear}.`);
      await syncMonthlyApontamentoToSupabase(updatedMonthlyApontamento);
    } catch (e) {
      console.warn(`[deleteApontamento] Immediate Supabase sync of monthly apontamento deletion for ${monthYear} failed, data remains local.`, e);
      // Não relança o erro, pois a exclusão já está salva localmente.
    }
  }
};

// Deleta o registro mensal completo
export const deleteApontamentosByMonth = async (userId: string, monthYear: string): Promise<number> => {
  const online = await isOnline();
  
  console.log(`[deleteApontamentosByMonth] Deleting local MonthlyApontamento for user: ${userId}, month: ${monthYear}`);
  // Deleta no IndexedDB
  await deleteLocalMonthlyApontamento(userId, monthYear);

  if (online) {
    console.log(`[deleteApontamentosByMonth] Online. Deleting from Supabase for user: ${userId}, month: ${monthYear}`);
    // Deleta no Supabase
    const { error: supabaseError, count } = await supabase
      .from('monthly_apontamentos')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('month_year', monthYear);

    if (supabaseError) {
      console.error(`[deleteApontamentosByMonth] Error deleting monthly apontamentos from Supabase for ${monthYear}:`, supabaseError);
      throw new Error(`Erro ao excluir apontamentos mensais do Supabase: ${supabaseError.message}`);
    }
    console.log(`[deleteApontamentosByMonth] Deleted ${count || 0} records from Supabase for ${monthYear}.`);
    return count || 0;
  }

  console.log(`[deleteApontamentosByMonth] Offline. Only local deletion performed for ${monthYear}.`);
  return 0; // Se offline, apenas a exclusão local é feita.
};

// A função syncPendingApontamentos não é mais necessária no mesmo formato,
// pois a unidade de sincronização agora é o MonthlyApontamento.
// A lógica de `useOfflineSync` precisará ser ajustada para lidar com isso.
export const syncPendingApontamentos = async (userId: string): Promise<number> => {
  // Esta função precisaria ser reescrita para iterar sobre todos os monthlyApontamentos
  // locais que não foram sincronizados (e.g., `updated_at` local > `updated_at` remoto)
  // Por enquanto, vamos simplificar e apenas retornar 0.
  // Uma implementação completa exigiria um mecanismo mais robusto de detecção de mudanças.
  return 0;
};


// --- Funções de Importação e Exportação (mantidas) ---

export const importParts = async (parts: Part[]): Promise<void> => {
  const { error: supabaseError } = await supabase
    .from('parts')
    .upsert(parts, { onConflict: 'id' });

  if (supabaseError) {
    console.error('Error importing parts to Supabase:', supabaseError);
    throw new Error(`Erro ao importar peças para o Supabase: ${supabaseError.message}`);
  }
  await bulkPutLocalParts(parts);
};

export const importAfs = async (afs: Af[]): Promise<void> => {
  // CHAVE DE CONFLITO ALTERADA PARA 'af_number'
  const { error: supabaseError } = await supabase
    .from('afs')
    .upsert(afs, { onConflict: 'af_number' });

  if (supabaseError) {
    console.error('Error importing AFs to Supabase:', supabaseError);
    throw new Error(`Erro ao importar AFs para o Supabase: ${supabaseError.message}`);
  }
  await bulkPutLocalAfs(afs);
};

export const exportDataAsCsv = (data: any[], filename: string): void => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const cleanupEmptyParts = async (): Promise<number> => {
  let deletedCount = 0;
  const fetchPageSize = 1000; // Quantas peças buscar de uma vez
  const deleteBatchSize = 500; // Quantos IDs excluir em uma chamada do Supabase
  let offset = 0;
  let hasMoreToFetch = true;
  let allIdsToDelete: string[] = [];

  while (hasMoreToFetch) {
    const { data, error } = await supabase
      .from('parts')
      .select('id, codigo, descricao')
      .range(offset, offset + fetchPageSize - 1);

    if (error) {
      console.error('Error fetching parts for cleanup from Supabase (paginated):', error);
      throw new Error(`Erro ao buscar peças para limpeza: ${error.message}`);
    }

    if (data && data.length > 0) {
      const emptyPartsIds = data
        .filter(part =>
          (!part.codigo || part.codigo.trim() === '') &&
          (!part.descricao || part.descricao.trim() === '') &&
          (!part.name || part.name.trim() === '') // Inclui o novo campo 'name' na verificação
        )
        .map(part => part.id);
      allIdsToDelete = allIdsToDelete.concat(emptyPartsIds);
      offset += fetchPageSize;
    } else {
      hasMoreToFetch = false;
    }
  }

  if (allIdsToDelete.length > 0) {
    // Realiza as exclusões em lotes
    for (let i = 0; i < allIdsToDelete.length; i += deleteBatchSize) {
      const batchIds = allIdsToDelete.slice(i, i + deleteBatchSize);
      const { error: deleteError } = await supabase
        .from('parts')
        .delete()
        .in('id', batchIds);

      if (deleteError) {
        console.error('Error deleting empty parts batch from Supabase:', deleteError);
        throw new Error(`Erro ao excluir peças vazias do Supabase (lote): ${deleteError.message}`);
      }
      deletedCount += batchIds.length;
    }

    // Deleta do IndexedDB em massa após todas as exclusões do Supabase
    await localDb.parts.bulkDelete(allIdsToDelete);
  }

  return deletedCount;
};