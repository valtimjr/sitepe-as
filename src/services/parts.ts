import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import {
  localDb,
  bulkPutLocalParts,
  getLocalParts, // Exportado explicitamente
  searchLocalParts, // Mantido para uso em modo offline, mas não em searchParts
  updateLocalPart,
  Part as LocalPart,
} from '@/services/localDbService';
import { isOnline } from './utils/network';
import { fetchAllPaginated } from './utils/supabase-fetch';

export interface Part extends LocalPart {}

/**
 * Fetches parts from local IndexedDB.
 */
export const getPartsFromLocal = async (): Promise<Part[]> => {
  return getLocalParts();
};

/**
 * Fetches parts from Supabase and updates the local IndexedDB cache.
 * Always tries to return data from local cache if available,
 * and updates it from Supabase when online.
 */
export const getParts = async (): Promise<Part[]> => {
  console.log('getParts: Iniciando carregamento de peças...');
  const online = await isOnline();
  let localData: Part[] = [];

  try {
    localData = await getLocalParts(); // Sempre tenta obter dados locais primeiro
    console.log(`getParts: Dados locais encontrados: ${localData.length} itens.`);
  } catch (localError) {
    console.error('getParts: Erro ao carregar peças do cache local:', localError);
  }

  if (online) {
    console.log('getParts: Online. Tentando buscar peças do Supabase...');
    try {
      const remoteParts = await fetchAllPaginated<Part>('parts', 'codigo');
      console.log(`getParts: Supabase retornou ${remoteParts.length} peças.`);
      
      // Sempre limpa o cache local para refletir o estado atual do Supabase
      await localDb.parts.clear();
      if (remoteParts.length > 0) {
        console.log('getParts: Atualizando cache local com dados do Supabase...');
        await bulkPutLocalParts(remoteParts);
        console.log('getParts: Cache local de peças atualizado com sucesso.');
      } else {
        console.log('getParts: Supabase não retornou peças. Cache local esvaziado.');
      }
      return remoteParts;
    } catch (remoteError) {
      console.error('getParts: Falha ao buscar peças do Supabase. Retornando dados do cache local.', remoteError);
      return localData; // Se a busca remota falhar, retorna o que foi obtido do cache local
    }
  } else {
    console.log('getParts: Offline. Retornando peças do cache local.');
    return localData; // Se offline, apenas retorna os dados locais
  }
};

export const getAllPartsForExport = async (): Promise<Part[]> => {
  return fetchAllPaginated<Part>('parts', 'codigo');
};

export const addPart = async (part: Omit<Part, 'id'>): Promise<string> => {
  const newPart = { ...part, id: uuidv4() };
  const { data, error } = await supabase
    .from('parts')
    .insert(newPart)
    .select();

  if (error) {
    console.error('Error adding part to Supabase:', error);
    throw new Error(`Erro ao adicionar peça no Supabase: ${error.message}`);
  }

  await localDb.parts.add(newPart);
  return data[0].id;
};

/**
 * Searches for parts in Supabase by 'codigo' only.
 * Falls back to local search if offline or Supabase query fails.
 */
export const searchParts = async (query: string): Promise<Part[]> => {
  const online = await isOnline();
  const lowerCaseQuery = query.toLowerCase().trim();

  if (!online) {
    console.log('Offline: Searching parts in local cache.');
    // Mantém a busca local mais abrangente para o modo offline
    return searchLocalParts(query); 
  }

  if (!lowerCaseQuery) {
    // Se a query estiver vazia, retorna todas as peças do Supabase (ou cache local se falhar)
    return getParts(); 
  }

  try {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .ilike('codigo', `%${lowerCaseQuery}%`) // Busca apenas por código
      .order('codigo', { ascending: true }); // Ordena por código

    if (error) {
      console.error('Error searching parts in Supabase, falling back to local cache:', error);
      return searchLocalParts(query); // Fallback para busca local em caso de erro
    }

    return data as Part[];
  } catch (error) {
    console.error('Unexpected error during Supabase search, falling back to local cache:', error);
    return searchLocalParts(query); // Fallback para busca local em caso de erro inesperado
  }
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  const { error: supabaseError } = await supabase
    .from('parts')
    .update({ codigo: updatedPart.codigo, descricao: updatedPart.descricao, tags: updatedPart.tags })
    .eq('id', updatedPart.id);

  if (supabaseError) {
    console.error('Error updating part in Supabase:', supabaseError);
    throw new Error(`Erro ao atualizar a peça no Supabase: ${supabaseError.message}`);
  }

  await updateLocalPart(updatedPart);
};

export const deletePart = async (id: string): Promise<void> => {
  const { error: supabaseError } = await supabase
    .from('parts')
    .delete()
    .eq('id', id);

  if (supabaseError) {
    console.error('Error deleting part from Supabase:', supabaseError);
    throw new Error(`Erro ao excluir peça do Supabase: ${supabaseError.message}`);
  }

  await localDb.parts.delete(id);
};

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

export const cleanupEmptyParts = async (): Promise<number> => {
  let deletedCount = 0;
  const fetchPageSize = 1000;
  const deleteBatchSize = 500;
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

    await localDb.parts.bulkDelete(allIdsToDelete);
  }

  return deletedCount;
};