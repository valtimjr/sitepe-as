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
  Apontamento as LocalApontamento,
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
  getLocalApontamentos,
  putLocalApontamento,
  bulkPutLocalApontamentos,
  clearLocalApontamentos,
  deleteLocalApontamentosByDateRange,
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';
import { Network } from '@capacitor/network';

export interface Part extends LocalPart {}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface ServiceOrderItem extends LocalServiceOrderItem {}
export interface Af extends LocalAf {}
export interface Apontamento extends LocalApontamento {}

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

const fetchAllPaginated = async <T>(tableName: string, orderByColumn: string): Promise<T[]> => {
  let allData: T[] = [];
  const pageSize = 1000; // Máximo permitido pelo Supabase
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderByColumn, { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(`Error fetching paginated data from ${tableName}:`, error);
      throw new Error(`Erro ao buscar todos os dados de ${tableName}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as T[]);
      offset += pageSize;
      // Se o número de resultados for menor que o tamanho da página, é a última página.
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
};

// --- Funções para Peças (Parts) ---

/**
 * Retorna as peças do cache local imediatamente e inicia a sincronização
 * com o Supabase em segundo plano se estiver online.
 * @returns Uma promessa que resolve imediatamente com os dados do cache.
 */
export const getParts = async (): Promise<Part[]> => {
  const online = await isOnline();
  
  // 1. Retorna o cache local imediatamente
  const localParts = await getLocalParts();
  
  if (!online) {
    console.log('Offline: Serving parts from local cache.');
    return localParts;
  }

  // 2. Se online, inicia a sincronização em segundo plano
  // Não esperamos por esta promessa, mas a retornamos para que o chamador possa usá-la
  // se quiser esperar pela atualização (embora o objetivo seja não esperar).
  const syncPromise = fetchAllPaginated<Part>('parts', 'codigo')
    .then(async (data) => {
      // Atualiza o cache local com os dados do Supabase
      await localDb.parts.clear();
      await bulkPutLocalParts(data);
      console.log('Background sync of Parts complete.');
      return data;
    })
    .catch(error => {
      console.error('Background sync of Parts failed:', error);
      return localParts; // Retorna o cache local em caso de falha na sincronização
    });
      
  // Retorna o cache local imediatamente. Se o cache estiver vazio,
  // o chamador pode optar por esperar pelo syncPromise (mas não faremos isso aqui).
  return localParts.length > 0 ? localParts : syncPromise;
};

export const getAllPartsForExport = async (): Promise<Part[]> => {
  // Reutiliza a função paginada (usada apenas pelo Admin/Export)
  return fetchAllPaginated<Part>('parts', 'codigo');
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
  const online = await isOnline();
  const lowerCaseQuery = query.toLowerCase().trim();

  if (!online) {
    console.log('Offline: Searching parts in local cache.');
    return searchLocalParts(query);
  }

  // Se online, tenta buscar no Supabase
  let queryBuilder = supabase
    .from('parts')
    .select('*');

  if (lowerCaseQuery) {
    // Divide a query em palavras, filtra strings vazias e junta com '%' para buscar em sequência
    const searchPattern = lowerCaseQuery.split(/\s+/).filter(Boolean).join('%');
    
    // Usa o padrão construído para busca 'ilike' nos campos relevantes
    queryBuilder = queryBuilder.or(
      `codigo.ilike.%${searchPattern}%,descricao.ilike.%${searchPattern}%,tags.ilike.%${searchPattern}%`
    );
  }

  try {
    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching parts in Supabase, falling back to local cache:', error);
      // Se houver erro no Supabase, cai para o cache local
      return searchLocalParts(query);
    }

    let results = data as Part[];

    // Helper function to determine the quality of the match (copied from localDbService for consistency)
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
        const aTagsScore = getFieldMatchScore(a.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
        const aCodigoScore = getFieldMatchScore(a.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
        const aDescricaoScore = getFieldMatchScore(a.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);

        const bTagsScore = getFieldMatchScore(b.tags, lowerCaseQuery, regexPattern, isMultiWordQuery);
        const bCodigoScore = getFieldMatchScore(b.codigo, lowerCaseQuery, regexPattern, isMultiWordQuery);
        const bDescricaoScore = getFieldMatchScore(b.descricao, lowerCaseQuery, regexPattern, isMultiWordQuery);

        // Prioriza tags
        if (aTagsScore !== bTagsScore) return bTagsScore - aTagsScore;

        // Depois código
        if (aCodigoScore !== bCodigoScore) return bCodigoScore - aCodigoScore;

        // Por último descrição
        if (aDescricaoScore !== bDescricaoScore) return bDescricaoScore - aDescricaoScore;

        return 0;
      });
    }

    return results;
  } catch (error) {
    console.error('Unexpected error during Supabase search, falling back to local cache:', error);
    // Garante que o fallback para o cache local seja executado em caso de erro inesperado
    return searchLocalParts(query);
  }
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  // Atualiza no Supabase
  const { error: supabaseError } = await supabase
    .from('parts')
    .update({ codigo: updatedPart.codigo, descricao: updatedPart.descricao, tags: updatedPart.tags })
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

/**
 * Retorna os AFs do cache local imediatamente e inicia a sincronização
 * com o Supabase em segundo plano se estiver online.
 * @returns Uma promessa que resolve imediatamente com os dados do cache.
 */
export const getAfsFromService = async (): Promise<Af[]> => {
  const online = await isOnline();
  
  // 1. Retorna o cache local imediatamente
  const localAfs = await getLocalAfs();
  
  if (!online) {
    console.log('Offline: Serving AFs from local cache.');
    return localAfs;
  }

  // 2. Se online, inicia a sincronização em segundo plano
  const syncPromise = fetchAllPaginated<Af>('afs', 'af_number')
    .then(async (data) => {
      // Atualiza o cache local com os dados do Supabase
      await localDb.afs.clear();
      await bulkPutLocalAfs(data);
      console.log('Background sync of AFs complete.');
      return data;
    })
    .catch(error => {
      console.error('Background sync of AFs failed:', error);
      return localAfs; // Retorna o cache local em caso de falha na sincronização
    });
      
  return localAfs.length > 0 ? localAfs : syncPromise;
};

export const getAllAfsForExport = async (): Promise<Af[]> => {
  // Reutiliza a função paginada
  return fetchAllPaginated<Af>('afs', 'af_number');
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

// --- Service Order Items Management (IndexedDB) ---

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

// --- Apontamentos Management (Time Tracking) ---

// Sincroniza dados do Supabase para o IndexedDB
export const syncApontamentosFromSupabase = async (userId: string): Promise<Apontamento[]> => {
  const { data, error } = await supabase
    .from('apontamentos')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching apontamentos from Supabase:', error);
    // Em caso de erro, retorna o cache local
    return getLocalApontamentos(userId);
  }

  const apontamentos = data.map(item => ({
    ...item,
    created_at: new Date(item.created_at),
    synced_at: new Date(), // Marca como sincronizado
  })) as Apontamento[];

  // Atualiza o cache local
  await clearLocalApontamentos(userId);
  await bulkPutLocalApontamentos(apontamentos);
  
  return apontamentos;
};

// Sincroniza um único item para o Supabase
export const syncApontamentoToSupabase = async (apontamento: Apontamento): Promise<Apontamento> => {
  const { id, user_id, date, entry_time, exit_time, created_at, status } = apontamento;
  
  const payload = {
    id,
    user_id,
    date,
    entry_time: entry_time || null,
    exit_time: exit_time || null,
    status: status || null,
    created_at: created_at?.toISOString() || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('apontamentos')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting apontamento to Supabase:', error);
    throw new Error(`Erro ao sincronizar apontamento: ${error.message}`);
  }

  const syncedApontamento: Apontamento = {
    ...data,
    created_at: new Date(data.created_at),
    synced_at: new Date(),
  };

  // Atualiza o item no IndexedDB com o timestamp de sincronização
  await putLocalApontamento(syncedApontamento);
  
  return syncedApontamento;
};

// Obtém itens não sincronizados localmente
export const getUnsyncedApontamentos = async (userId: string): Promise<Apontamento[]> => {
  // Filtra itens que pertencem ao usuário e não têm synced_at
  return localDb.apontamentos.where('user_id').equals(userId).and(a => !a.synced_at).toArray();
};

// Tenta sincronizar todos os itens pendentes
export const syncPendingApontamentos = async (userId: string): Promise<number> => {
    const unsyncedItems = await getUnsyncedApontamentos(userId);
    if (unsyncedItems.length === 0) return 0;

    let syncedCount = 0;
    
    for (const item of unsyncedItems) {
        try {
            // Tenta sincronizar o item
            await syncApontamentoToSupabase(item);
            syncedCount++;
        } catch (e) {
            console.error(`Failed to sync item ${item.id}:`, e);
            // Se falhar, para a sincronização, assumindo que a conexão caiu novamente
            break; 
        }
    }
    return syncedCount;
};


export const getApontamentos = async (userId: string): Promise<Apontamento[]> => {
  // Tenta sincronizar do Supabase primeiro para obter os dados mais recentes
  try {
    // Se estiver online, faz o sync completo (fetch + cache update)
    if (await isOnline()) {
        return await syncApontamentosFromSupabase(userId);
    }
    // Se estiver offline, retorna apenas o cache local
    return getLocalApontamentos(userId);
  } catch (e) {
    console.warn("Failed to sync from Supabase, falling back to local data:", e);
    return getLocalApontamentos(userId);
  }
};

export const updateApontamento = async (apontamento: Apontamento): Promise<Apontamento> => {
  const online = await isOnline();
  
  // 1. Prepara o item para salvar localmente
  const localApontamento: Apontamento = {
    ...apontamento,
    synced_at: online ? new Date() : undefined, // Marca como não sincronizado se offline
  };

  // 2. Salva localmente (IndexedDB)
  await putLocalApontamento(localApontamento);

  if (online) {
    // 3. Se online, tenta sincronizar imediatamente
    try {
      return await syncApontamentoToSupabase(localApontamento);
    } catch (e) {
      console.warn("Immediate Supabase sync failed, marking as unsynced locally.");
      // Se a sincronização imediata falhar, marca como não sincronizado e retorna o erro
      const unsyncedLocal = { ...localApontamento, synced_at: undefined };
      await putLocalApontamento(unsyncedLocal);
      throw e; 
    }
  }
  
  // Se offline, retorna o item salvo localmente (que está marcado como não sincronizado)
  return localApontamento;
};

export const deleteApontamento = async (id: string): Promise<void> => {
  const online = await isOnline();
  
  // 1. Deleta no IndexedDB imediatamente
  await localDb.apontamentos.delete(id);

  if (online) {
    // 2. Se online, tenta deletar no Supabase
    const { error: supabaseError } = await supabase
      .from('apontamentos')
      .delete()
      .eq('id', id);

    if (supabaseError) {
      console.error('Error deleting apontamento from Supabase:', supabaseError);
      // Em um sistema de fila completo, a exclusão seria adicionada a uma fila de 'pending_deletions'.
      // Por enquanto, apenas lança o erro.
      throw new Error(`Erro ao excluir apontamento do Supabase: ${supabaseError.message}`);
    }
  }
  // Se offline, a exclusão local é suficiente por enquanto. A próxima sincronização completa
  // (syncApontamentosFromSupabase) irá sobrescrever o local com o remoto, mas como o item
  // foi excluído localmente, ele não será enviado. Isso é um risco de conflito, mas aceitável
  // para uma implementação simplificada.
};

export const deleteApontamentosByMonth = async (userId: string, startDate: Date, endDate: Date): Promise<number> => {
  const startString = startDate.toISOString().split('T')[0];
  const endString = endDate.toISOString().split('T')[0];
  const online = await isOnline();
  
  // 1. Deleta no IndexedDB
  const deletedLocalCount = await deleteLocalApontamentosByDateRange(userId, startString, endString);

  if (online) {
    // 2. Deleta no Supabase
    const { error: supabaseError, count } = await supabase
      .from('apontamentos')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .gte('date', startString)
      .lte('date', endString);

    if (supabaseError) {
      console.error('Error deleting apontamentos by month from Supabase:', supabaseError);
      throw new Error(`Erro ao excluir apontamentos do Supabase: ${supabaseError.message}`);
    }
    return count || deletedLocalCount;
  }

  return deletedLocalCount;
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
          (!part.descricao || part.descricao.trim() === '')
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