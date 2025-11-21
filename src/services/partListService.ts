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
  getLocalMonthlyApontamento, // Importa diretamente
  putLocalMonthlyApontamento, 
  deleteLocalMonthlyApontamento 
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';
import { Network } from '@capacitor/network'; // Importar Network
import { format } from 'date-fns';
import { DailyApontamento, MonthlyApontamento, RelatedPart, Part as SupabasePart } from '@/types/supabase'; // Removido PartImage

export interface Part extends SupabasePart {}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface ServiceOrderItem extends LocalServiceOrderItem {}
export interface Af extends LocalAf {}
export type Apontamento = DailyApontamento; // Apontamento agora é o DailyApontamento

// Re-exportar getLocalMonthlyApontamento para que outros módulos possam importá-lo de partListService
export const getLocalMonthlyApontamentoService = getLocalMonthlyApontamento;

// Helper para garantir que DailyApontamento objetos não contenham um campo 'id' ou 'user_id'
const cleanDailyApontamento = (ap: DailyApontamento): DailyApontamento => {
  const { id, user_id, ...rest } = ap as any; // Converte para any para desestruturar 'id' e 'user_id' com segurança, se existirem
  return rest;
};

const seedPartsFromFile = async (): Promise<Part[]> => {
  try {
    const response = await fetch('/data/parts.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("[seedPartsFromFile] Failed to fetch or parse parts.json:", error);
    return [];
  }
};

const seedAfsFromFile = async (): Promise<Af[]> => {
  let parsedAfs: Af[] = [];
  try {
    const response = await fetch('/data/afs.json');
    if (response.ok) {
      parsedAfs = await response.json();
    }
  } catch (jsonError) {
    // console.warn('[seedAfsFromFile] Erro ao buscar afs.json, tentando CSV:', jsonError);
  }

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
                af_number: row.af_number || row.codigo || row.AF,
                descricao: row.descricao || row.description || '',
              })).filter((af: any) => af.af_number);
              resolve();
            },
            error: (error: Error) => {
              reject(error);
            }
          });
        });
      }
    } catch (csvError) {
      console.error("[seedAfsFromFile] Falha ao buscar ou analisar afs.csv:", csvError);
    }
  }
  return parsedAfs;
};

/**
 * Função para buscar peças com paginação e contagem total (usada apenas na PartManagementTable).
 * @param query Query de busca.
 * @param page Número da página (base 1).
 * @param pageSize Tamanho da página.
 * @returns Um objeto contendo as peças e a contagem total.
 */
export const searchPartsPaginated = async (query: string, page: number = 1, pageSize: number = 50): Promise<{ parts: Part[], totalCount: number }> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  const offset = (page - 1) * pageSize;

  // 1. Busca remota (Supabase)
  let queryBuilder = supabase
    .from('parts')
    .select('*', { count: 'exact' });

  if (lowerCaseQuery) {
    const searchPattern = `%${lowerCaseQuery.split(/\s+/).filter(Boolean).join('%')}%`;
    queryBuilder = queryBuilder.or(
      `codigo.ilike.${searchPattern},descricao.ilike.${searchPattern},tags.ilike.${searchPattern},name.ilike.${searchPattern}`
    );
  }

  // Adiciona uma ordenação no servidor para agrupar códigos.
  // Isso aumenta a chance de uma busca por código trazer o resultado correto na primeira página.
  // A ordenação final de prioridade é feita no cliente.
  queryBuilder = queryBuilder.order('codigo', { ascending: true });

  // Aplica paginação
  queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('[searchPartsPaginated] Erro ao buscar peças no Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    const localResults = await searchLocalParts(query);
    const totalCount = localResults.length;
    const paginatedLocalResults = localResults.slice(offset, offset + pageSize);
    return { parts: paginatedLocalResults as Part[], totalCount };
  }

  let results = data as Part[];
  const totalCount = count || 0;

  // 2. Ordenação no cliente (para garantir consistência com a busca local)
  const getFieldMatchScore = (fieldValue: string | undefined, query: string, regex: RegExp, isMultiWord: boolean): number => {
    if (!fieldValue) return 0;
    const lowerFieldValue = fieldValue.toLowerCase();

    if (isMultiWord) {
      // For multi-word, we just check if the sequence exists.
      // A more complex scoring could be implemented here if needed.
      return regex.test(lowerFieldValue) ? 1 : 0;
    } else {
      // For single-word, we can have more granular scoring.
      if (lowerFieldValue === query) return 4; // Exact match
      if (lowerFieldValue.startsWith(query)) return 3; // Starts with
      if (lowerFieldValue.includes(query)) return 2; // Includes
    }
    return 0;
  };

  if (lowerCaseQuery) {
    const queryWords = lowerCaseQuery.split(/\s+/).filter(Boolean);
    const isMultiWordQuery = queryWords.length > 1;
    const escapedWords = queryWords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexPattern = new RegExp(escapedWords.join('.*'), 'i');

    results.sort((a, b) => {
      const aTagsScore = getFieldMatchScore(a.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const bTagsScore = getFieldMatchScore(b.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
      if (aTagsScore !== bTagsScore) return bTagsScore - aTagsScore;

      const aCodigoScore = getFieldMatchScore(a.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const bCodigoScore = getFieldMatchScore(b.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
      if (aCodigoScore !== bCodigoScore) return bCodigoScore - aCodigoScore;

      const aDescricaoScore = getFieldMatchScore(a.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const bDescricaoScore = getFieldMatchScore(b.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const aNameScore = getFieldMatchScore(a.name, lowerCaseQuery, regexPattern, isMultiWordQuery);
      const bNameScore = getFieldMatchScore(b.name, lowerCaseQuery, regexPattern, isMultiWordQuery);
      
      const combinedAScore = Math.max(aDescricaoScore, aNameScore);
      const combinedBScore = Math.max(bDescricaoScore, bNameScore);

      if (combinedAScore !== combinedBScore) return combinedBScore - combinedAScore;

      return 0;
    });
  }

  return { parts: results, totalCount };
};

/**
 * Função para buscar peças (sem paginação) para uso em inputs de busca interativa.
 * Retorna apenas o array de Part[].
 * @param query Query de busca.
 * @returns Array de Part[].
 */
export const searchParts = async (query: string): Promise<Part[]> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  if (!lowerCaseQuery) return [];

  // Fetch from all fields to get a candidate pool
  const searchPattern = `%${lowerCaseQuery.split(/\s+/).filter(Boolean).join('%')}%`;
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .or(`codigo.ilike.${searchPattern},descricao.ilike.${searchPattern},name.ilike.${searchPattern},tags.ilike.${searchPattern}`)
    .limit(250); // Fetch a decent pool to sort from

  if (error) {
    console.error('[searchParts] Erro ao buscar no Supabase:', error);
    return searchLocalParts(query) as Promise<Part[]>; // Fallback
  }

  let results = data || [];

  // Now apply the user's priority sorting
  const getFieldMatchScore = (fieldValue: string | undefined, query: string, regex: RegExp, isMultiWord: boolean): number => {
    if (!fieldValue) return 0;
    const lowerFieldValue = fieldValue.toLowerCase();

    if (isMultiWord) {
      // For multi-word, we just check if the sequence exists.
      // A more complex scoring could be implemented here if needed.
      return regex.test(lowerFieldValue) ? 1 : 0;
    } else {
      // For single-word, we can have more granular scoring.
      if (lowerFieldValue === query) return 4; // Exact match
      if (lowerFieldValue.startsWith(query)) return 3; // Starts with
      if (lowerFieldValue.includes(query)) return 2; // Includes
    }
    return 0;
  };

  const queryWords = lowerCaseQuery.split(/\s+/).filter(Boolean);
  const isMultiWordQuery = queryWords.length > 1;
  const escapedWords = queryWords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regexPattern = new RegExp(escapedWords.join('.*'), 'i');

  results.sort((a, b) => {
    const aTagsScore = getFieldMatchScore(a.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
    const bTagsScore = getFieldMatchScore(b.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
    if (aTagsScore !== bTagsScore) return bTagsScore - aTagsScore;

    const aCodigoScore = getFieldMatchScore(a.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
    const bCodigoScore = getFieldMatchScore(b.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
    if (aCodigoScore !== bCodigoScore) return bCodigoScore - aCodigoScore;

    const aDescricaoScore = getFieldMatchScore(a.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);
    const bDescricaoScore = getFieldMatchScore(b.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);
    const aNameScore = getFieldMatchScore(a.name, lowerCaseQuery, regexPattern, isMultiWordQuery);
    const bNameScore = getFieldMatchScore(b.name, lowerCaseQuery, regexPattern, isMultiWordQuery);
    
    const combinedAScore = Math.max(aDescricaoScore, aNameScore);
    const combinedBScore = Math.max(bDescricaoScore, bNameScore);

    if (combinedAScore !== combinedBScore) return combinedBScore - combinedAScore;

    return 0;
  });

  return results.slice(0, 100) as Part[];
};

/**
 * Função de conveniência para obter todas as peças (sem paginação) para cache/exportação.
 */
export const getParts = async (): Promise<Part[]> => {
  const localParts = await getLocalParts();
  if (localParts.length > 0) {
    (async () => {
      try {
        const allRemoteParts = await getAllPartsForExport();
        if (allRemoteParts.length !== localParts.length) {
          await localDb.parts.clear();
          await bulkPutLocalParts(allRemoteParts);
        }
      } catch (e) {
        console.warn('Background parts sync failed:', e);
      }
    })();
    return localParts as Part[];
  }

  try {
    const allRemoteParts = await getAllPartsForExport();
    if (allRemoteParts.length > 0) {
      await bulkPutLocalParts(allRemoteParts);
      return allRemoteParts;
    }

    const partsFromFile = await seedPartsFromFile();
    if (partsFromFile.length > 0) {
      const { error: upsertError } = await supabase.from('parts').upsert(partsFromFile, { onConflict: 'id' });
      if (upsertError) throw upsertError;
      await bulkPutLocalParts(partsFromFile);
      return partsFromFile;
    }
    return [];
  } catch (error) {
    console.error('[getParts] Erro ao buscar peças:', error);
    return [];
  }
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
      console.error('[getAllPartsForExport] Erro ao buscar todas as peças para exportação do Supabase (paginado):', error);
      throw new Error(`Erro ao buscar todas as peças para exportação: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as Part[]);
      offset += pageSize;
    } else {
      hasMore = false; // Não há mais dados para buscar
    }
    // Adicionado: Pequeno atraso para evitar sobrecarga da API em loops grandes
    await new Promise(resolve => setTimeout(resolve, 50));
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
    console.error('[addPart] Erro ao adicionar peça no Supabase:', error);
    throw new Error(`Erro ao adicionar peça no Supabase: ${error.message}`);
  }

  // Adiciona ao IndexedDB também
  await localDb.parts.add(newPart);
  return data[0].id;
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  // Atualiza no Supabase
  const { error: supabaseError } = await supabase
    .from('parts')
    .update({ 
      codigo: updatedPart.codigo, 
      descricao: updatedPart.descricao, 
      tags: updatedPart.tags, 
      name: updatedPart.name,
      itens_relacionados: updatedPart.itens_relacionados || [], // Inclui o novo campo
    })
    .eq('id', updatedPart.id);

  if (supabaseError) {
    console.error('[updatePart] Erro ao atualizar peça no Supabase:', supabaseError);
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
    console.error('[deletePart] Erro ao deletar peça do Supabase:', supabaseError);
    throw new Error(`Erro ao excluir peça do Supabase: ${supabaseError.message}`);
  }

  // Deleta no IndexedDB
  await localDb.parts.delete(id);
};

// --- Funções para AFs ---
export const getAfsFromService = async (): Promise<Af[]> => {
  const localAfs = await getLocalAfs();
  if (localAfs.length > 0) {
    (async () => {
      try {
        const { data, error } = await supabase.from('afs').select('*').order('af_number', { ascending: true });
        if (error) throw error;
        if (data.length !== localAfs.length) {
          await localDb.afs.clear();
          await bulkPutLocalAfs(data as Af[]);
        }
      } catch (e) {
        console.warn('Background AF sync failed:', e);
      }
    })();
    return localAfs;
  }

  try {
    const { data, error } = await supabase.from('afs').select('*').order('af_number', { ascending: true });
    if (error) throw error;

    if (data && data.length > 0) {
      await bulkPutLocalAfs(data as Af[]);
      return data as Af[];
    }

    const afsFromFile = await seedAfsFromFile();
    if (afsFromFile.length > 0) {
      const { error: upsertError } = await supabase.from('afs').upsert(afsFromFile, { onConflict: 'af_number' });
      if (upsertError) throw upsertError;
      await bulkPutLocalAfs(afsFromFile);
      return afsFromFile;
    }

    return [];
  } catch (error) {
    console.error('[getAfsFromService] Erro ao buscar AFs:', error);
    return [];
  }
};

export const searchAfs = async (query: string): Promise<Af[]> => {
  const lowerCaseQuery = query.toLowerCase().trim();
  if (lowerCaseQuery.length < 1) return [];

  try {
    const searchPattern = `%${lowerCaseQuery}%`;
    const { data, error } = await supabase
      .from('afs')
      .select('*')
      .or(`af_number.ilike.${searchPattern},descricao.ilike.${searchPattern}`)
      .order('af_number', { ascending: true })
      .limit(50);

    if (error) {
      throw error;
    }
    return data as Af[];
  } catch (error) {
    console.error('[searchAfs] Erro ao buscar AFs:', error);
    // Fallback para busca local
    const allAfs = await getLocalAfs();
    return allAfs.filter(af => 
      af.af_number.toLowerCase().includes(lowerCaseQuery) ||
      (af.descricao && af.descricao.toLowerCase().includes(lowerCaseQuery))
    ).slice(0, 50);
  }
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
      console.error('[getAllAfsForExport] Erro ao buscar todos os AFs para exportação do Supabase (paginado):', error);
      throw new Error(`Erro ao buscar todos os AFs para exportação: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as Af[]);
      offset += pageSize;
    } else {
      hasMore = false; // Não há mais dados para buscar
    }
    // Adicionado: Pequeno atraso para evitar sobrecarga da API em loops grandes
    await new Promise(resolve => setTimeout(resolve, 50));
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
    console.error('[addAf] Erro ao adicionar AF no Supabase:', error);
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
    console.error('[updateAf] Erro ao atualizar AF no Supabase:', supabaseError);
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
    console.error('[deleteAf] Erro ao deletar AF do Supabase:', supabaseError);
    throw new Error(`Erro ao excluir AF do Supabase: ${supabaseError.message}`);
  }

  // Deleta no IndexedDB
  await localDb.afs.delete(id);
};

// --- Funções para SimplePartItem (Lista de Peças Simples) ---
export const getSimplePartsListItems = async (): Promise<SimplePartItem[]> => {
  const items = await getLocalSimplePartsListItems();
  return items;
};

export const addSimplePartItem = async (item: Omit<SimplePartItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  const id = await addLocalSimplePartItem(item, customCreatedAt);
  return id;
};

export const updateSimplePartItem = async (updatedItem: SimplePartItem): Promise<void> => {
  await updateLocalSimplePartItem(updatedItem);
};

export const deleteSimplePartItem = async (id: string): Promise<void> => {
  try {
    await deleteLocalSimplePartItem(id);
  } catch (error) {
    console.error('localDbService: Error deleting item with ID:', id, error);
    throw error; // Re-lança o erro para que o chamador possa tratá-lo
  }
};

export const clearSimplePartsList = async (): Promise<void> => {
  await clearLocalSimplePartsList();
};

// --- Funções para ServiceOrderItem (Lista de Ordens de Serviço) ---
export const getServiceOrderItems = async (): Promise<ServiceOrderItem[]> => {
  const items = await getLocalServiceOrderItems();
  return items;
};

export const addServiceOrderItem = async (item: Omit<ServiceOrderItem, 'id'>, customCreatedAt?: Date): Promise<string> => {
  const newItem = { ...item, id: uuidv4(), created_at: customCreatedAt || new Date() };
  await addLocalServiceOrderItem(newItem, customCreatedAt);
  return newItem.id;
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

//export const getLocalMonthlyApontamentoService = getLocalMonthlyApontamento;

// Sincroniza dados do Supabase para o IndexedDB
export const syncMonthlyApontamentosFromSupabase = async (userId: string, monthYear: string, forcePull: boolean = false): Promise<MonthlyApontamento | undefined> => {
  
  const localMonthlyApontamento = await getLocalMonthlyApontamentoService(userId, monthYear);

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
    const remoteMonthlyApontamento: MonthlyApontamento = {
      ...data,
      data: (data.data as DailyApontamento[]).map(cleanDailyApontamento),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    if (localMonthlyApontamento) {
      // Se forcePull é true, ou se o remoto é mais recente que o local, atualiza o local
      if (forcePull || (remoteMonthlyApontamento.updated_at && localMonthlyApontamento.updated_at && new Date(remoteMonthlyApontamento.updated_at) > new Date(localMonthlyApontamento.updated_at))) {
        await putLocalMonthlyApontamento(remoteMonthlyApontamento);
        return remoteMonthlyApontamento;
      } else {
        return localMonthlyApontamento; // Retorna a versão local, que é a mais recente ou igual
      }
    } else {
      // Se não há local, apenas adiciona o remoto
      await putLocalMonthlyApontamento(remoteMonthlyApontamento);
      return remoteMonthlyApontamento;
    }
  }
  return undefined;
};

// Sincroniza um único objeto MonthlyApontamento para o Supabase
export const syncMonthlyApontamentoToSupabase = async (monthlyApontamento: MonthlyApontamento, forcePush: boolean = false): Promise<MonthlyApontamento> => {
  const { id, user_id, month_year, data, created_at, updated_at } = monthlyApontamento;
  
  // Limpa cada entrada diária antes de enviar para o Supabase
  const cleanedData = data.map(cleanDailyApontamento);

  const payload = {
    id,
    user_id,
    month_year,
    data: cleanedData, // Usa os dados limpos
    created_at: created_at || new Date().toISOString(),
    updated_at: updated_at || new Date().toISOString(), // Garante que updated_at esteja presente
  };

  if (!forcePush) {
    // Verifica a versão remota antes de enviar
    const { data: remoteData, error: remoteError } = await supabase
      .from('monthly_apontamentos')
      .select('updated_at')
      .eq('user_id', user_id)
      .eq('month_year', month_year)
      .single();

    if (remoteError && remoteError.code !== 'PGRST116') {
      console.error(`[syncMonthlyApontamentoToSupabase] Error fetching remote updated_at for ${month_year}:`, remoteError);
      // Em caso de erro ao buscar o remoto, assume que precisa enviar para evitar perda de dados
    } else if (remoteData && remoteData.updated_at && new Date(remoteData.updated_at) >= new Date(payload.updated_at)) {
      // Se o remoto é mais recente ou igual, não envia (a menos que forcePush)
      // Retorna o monthlyApontamento original, pois não houve alteração no Supabase
      return monthlyApontamento; 
    }
  }

  const { data: upsertedData, error } = await supabase
    .from('monthly_apontamentos')
    .upsert(payload, { onConflict: 'user_id,month_year' }) // Conflito em user_id e month_year
    .select()
    .single();

  if (error) {
    console.error(`[syncMonthlyApontamentoToSupabase] Error upserting monthly apontamento to Supabase for ${month_year}:`, error);
    throw new Error(`Erro ao sincronizar apontamento mensal: ${error.message}`);
  }

  const syncedMonthlyApontamento: MonthlyApontamento = {
    ...upsertedData,
    data: (upsertedData.data as DailyApontamento[]).map(cleanDailyApontamento), // Limpa IDs e user_id ao receber de volta
  };

  await putLocalMonthlyApontamento(syncedMonthlyApontamento);
  
  return syncedMonthlyApontamento;
};

// Obtém apontamentos diários para um mês específico
export const getApontamentos = async (userId: string, monthYear: string): Promise<DailyApontamento[]> => {
  const online = await isOnline();
  let monthlyApontamento: MonthlyApontamento | undefined;

  if (online) {
    // Tenta sincronizar do Supabase primeiro (com lógica de comparação)
    monthlyApontamento = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
  } else {
    // Se offline, tenta do cache local
    monthlyApontamento = await getLocalMonthlyApontamentoService(userId, monthYear);
  }

  return monthlyApontamento?.data || [];
};

// Atualiza um apontamento diário dentro do blob JSON mensal
export const updateApontamento = async (userId: string, monthYear: string, dailyApontamento: DailyApontamento): Promise<DailyApontamento> => {
  const online = await isOnline();
  let currentMonthlyApontamento = await getLocalMonthlyApontamentoService(userId, monthYear);

  if (!currentMonthlyApontamento) {
    // Se não existe localmente, tenta buscar do Supabase (se online)
    if (online) {
      currentMonthlyApontamento = await syncMonthlyApontamentosFromSupabase(userId, monthYear);
    }
    if (!currentMonthlyApontamento) {
      // Se ainda não existe, cria um novo registro mensal
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
    newDailyApontamentoToReturn = { ...cleanedDailyApontamento, updated_at: new Date().toISOString() };
    updatedDailyApontamentos[existingIndexByDate] = newDailyApontamentoToReturn;
  } else {
    // Caso contrário, adiciona como uma nova entrada.
    newDailyApontamentoToReturn = { ...cleanedDailyApontamento, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    updatedDailyApontamentos.push(newDailyApontamentoToReturn);
  }

  const updatedMonthlyApontamento: MonthlyApontamento = {
    ...currentMonthlyApontamento,
    data: updatedDailyApontamentos,
    updated_at: new Date().toISOString(), // Atualiza o timestamp do MonthlyApontamento
  };

  await putLocalMonthlyApontamento(updatedMonthlyApontamento);

  if (online) {
    try {
      // Chama syncMonthlyApontamentoToSupabase com a lógica de comparação
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
  let currentMonthlyApontamento = await getLocalMonthlyApontamentoService(userId, monthYear);

  if (!currentMonthlyApontamento) {
    // Se não existe localmente, não há o que deletar
    return;
  }

  // Filtra o apontamento pela data
  const updatedDailyApontamentos = currentMonthlyApontamento.data.filter(a => a.date !== dailyApontamentoDate);

  const updatedMonthlyApontamento: MonthlyApontamento = {
    ...currentMonthlyApontamento,
    data: updatedDailyApontamentos,
    updated_at: new Date().toISOString(), // Atualiza o timestamp do MonthlyApontamento
  };

  await putLocalMonthlyApontamento(updatedMonthlyApontamento);

  if (online) {
    try {
      // Chama syncMonthlyApontamentoToSupabase com a lógica de comparação
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
  
  // Deleta no IndexedDB
  await deleteLocalMonthlyApontamento(userId, monthYear);

  if (online) {
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
    return count || 0;
  }

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
      .select('id, codigo, descricao, name')
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
    // Adicionado: Pequeno atraso para evitar sobrecarga da API em loops grandes
    await new Promise(resolve => setTimeout(resolve, 50));
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

// NOVO: Função para criar relações em lote
export const batchUpdateRelations = async (codesToRelate: string[]): Promise<{ updatedCount: number, notFoundCodes: string[] }> => {
  // 1. Buscar todas as peças envolvidas
  const { data: foundParts, error: fetchError } = await supabase
    .from('parts')
    .select('*')
    .in('codigo', codesToRelate);

  if (fetchError) {
    throw new Error(`Erro ao buscar peças: ${fetchError.message}`);
  }

  const foundCodes = new Set(foundParts.map(p => p.codigo));
  const notFoundCodes = codesToRelate.filter(code => !foundCodes.has(code));

  // 2. Preparar as atualizações
  const updatedParts = foundParts.map(part => {
    const otherCodes = codesToRelate.filter(code => code !== part.codigo);
    const existingRelatedCodes = (part.itens_relacionados || []).map(r => r.codigo);
    const allRelatedCodes = Array.from(new Set([...existingRelatedCodes, ...otherCodes]));

    const newRelations = allRelatedCodes
      .map(code => {
        const relatedPart = foundParts.find(p => p.codigo === code);
        if (relatedPart) {
          return {
            codigo: relatedPart.codigo,
            name: relatedPart.name || relatedPart.descricao,
            desc: (relatedPart.name && relatedPart.name.trim() !== '' && relatedPart.descricao !== (relatedPart.name || '')) ? relatedPart.descricao : ''
          };
        }
        // Se uma relação existente não estiver no lote atual, busca-a na lista original da peça
        const existingRelationObject = (part.itens_relacionados || []).find(r => r.codigo === code);
        if (existingRelationObject) {
          return existingRelationObject;
        }
        return null;
      })
      .filter((p): p is RelatedPart => p !== null)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    return {
      ...part,
      itens_relacionados: newRelations,
    };
  });

  if (updatedParts.length === 0) {
    return { updatedCount: 0, notFoundCodes };
  }

  // 3. Atualizar no Supabase
  const { error: upsertError } = await supabase
    .from('parts')
    .upsert(updatedParts, { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`Erro ao atualizar relações: ${upsertError.message}`);
  }

  // 4. Atualizar no IndexedDB
  await bulkPutLocalParts(updatedParts);

  return { updatedCount: updatedParts.length, notFoundCodes };
};