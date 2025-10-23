import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import {
  localDb,
  getLocalUniqueAfs,
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
  Apontamento as LocalApontamento, // Importar nova interface
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
  getLocalApontamentos, // Importar novas funções
  putLocalApontamento,
  bulkPutLocalApontamentos,
  clearLocalApontamentos,
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';

export interface Part extends LocalPart {}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface ServiceOrderItem extends LocalServiceOrderItem {}
export interface Af extends LocalAf {}
export interface Apontamento extends LocalApontamento {} // Exportar nova interface

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
    if (response.ok) {
      parsedAfs = await response.json();
      source = 'JSON';
    } else {
      console.warn('seedAfs: Failed to fetch afs.json, trying CSV. Status:', response.status);
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
                af_number: row.af_number,
              }));
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
        .upsert(parsedAfs, { onConflict: 'id' }); // Usando upsert para evitar duplicatas

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

export const getParts = async (): Promise<Part[]> => {
  await seedPartsFromJson(); // Garante que o Supabase esteja populado

  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .limit(1000); // Limite de 1000 para exibição

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
      `codigo.ilike.%${searchPattern}%,descricao.ilike.%${searchPattern}%,tags.ilike.%${searchPattern}%`
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
export const getAfsFromService = async (): Promise<Af[]> => {
  await seedAfs(); // Garante que o Supabase esteja populado

  const { data, error } = await supabase
    .from('afs')
    .select('*')
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
    .update({ af_number: updatedAf.af_number })
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

export const getUniqueAfs = async (): Promise<string[]> => {
  // Chama getAfsFromService para garantir que os AFs completos (com ID) sejam buscados e o cache local seja atualizado.
  const allAfs = await getAfsFromService(); 
  // Mapeia para retornar apenas os números dos AFs, como esperado pela interface.
  return allAfs.map(af => af.af_number).sort();
};

// --- Funções para Apontamentos (Time Tracking) ---

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
    synced_at: new Date(),
  })) as Apontamento[];

  // Atualiza o cache local
  await clearLocalApontamentos(userId);
  await bulkPutLocalApontamentos(apontamentos);
  
  return apontamentos;
};

// Sincroniza dados do IndexedDB para o Supabase (bidirecional)
export const syncApontamentoToSupabase = async (apontamento: Apontamento): Promise<Apontamento> => {
  const { id, user_id, date, entry_time, exit_time, created_at, status } = apontamento;
  
  const payload = {
    id,
    user_id,
    date,
    entry_time: entry_time || null,
    exit_time: exit_time || null,
    status: status || null, // Inclui o novo campo status
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

export const getApontamentos = async (userId: string): Promise<Apontamento[]> => {
  // Tenta sincronizar do Supabase primeiro para obter os dados mais recentes
  try {
    return await syncApontamentosFromSupabase(userId);
  } catch (e) {
    console.warn("Failed to sync from Supabase, falling back to local data:", e);
    return getLocalApontamentos(userId);
  }
};

export const updateApontamento = async (apontamento: Apontamento): Promise<Apontamento> => {
  // Atualiza localmente e sincroniza com o Supabase
  await putLocalApontamento(apontamento);
  return syncApontamentoToSupabase(apontamento);
};

export const deleteApontamento = async (id: string): Promise<void> => {
  // Deleta no Supabase
  const { error: supabaseError } = await supabase
    .from('apontamentos')
    .delete()
    .eq('id', id);

  if (supabaseError) {
    console.error('Error deleting apontamento from Supabase:', supabaseError);
    throw new Error(`Erro ao excluir apontamento do Supabase: ${supabaseError.message}`);
  }

  // Deleta no IndexedDB
  await localDb.apontamentos.delete(id);
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
  const { error: supabaseError } = await supabase
    .from('afs')
    .upsert(afs, { onConflict: 'id' });

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