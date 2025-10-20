import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import {
  localDb,
  getLocalUniqueAfs,
  bulkPutLocalParts, // Alterado para bulkPutLocalParts
  getLocalParts,
  searchLocalParts,
  updateLocalPart,
  bulkPutLocalAfs, // Alterado para bulkPutLocalAfs
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
} from '@/services/localDbService';
import { supabase } from '@/integrations/supabase/client';

export interface Part extends LocalPart {}
export interface SimplePartItem extends LocalSimplePartItem {}
export interface ServiceOrderItem extends LocalServiceOrderItem {}
export interface Af extends LocalAf {}

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
      console.log('Falling back to IndexedDB for parts as Supabase check failed.');
      return;
    }
  }

  if (supabasePartsCount && supabasePartsCount > 0) {
    console.log('Parts already seeded in Supabase.');
    return;
  }

  try {
    const response = await fetch('/data/parts.json'); // Caminho atualizado
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const parsedParts: Part[] = await response.json();
    console.log('Parsed parts from JSON:', parsedParts);

    // Adiciona ao Supabase
    const { error: insertError } = await supabase
      .from('parts')
      .insert(parsedParts);

    if (insertError) {
      console.error('Failed to seed parts to Supabase:', insertError);
      throw insertError;
    }
    console.log('Parts seeded from JSON to Supabase.');

    // Também adiciona ao IndexedDB para cache local
    await bulkPutLocalParts(parsedParts); // Alterado para bulkPutLocalParts
    console.log('Parts also seeded to IndexedDB.');

  } catch (error) {
    console.error("Failed to fetch or parse parts.json or seed Supabase/IndexedDB:", error);
  }
};

const seedAfs = async (): Promise<void> => {
  console.log('--- Starting seedAfs process ---');
  // 1. Primeiro, verifica se há AFs no Supabase
  const { count: supabaseAfsCount, error: countError } = await supabase
    .from('afs')
    .select('*', { count: 'exact' });

  if (countError) {
    console.error('seedAfs: Error checking Supabase AFs count:', countError);
    // Se houver erro ao contar, tenta carregar do IndexedDB como fallback
    const localAfsCount = await localDb.afs.count();
    if (localAfsCount > 0) {
      console.log('seedAfs: Falling back to IndexedDB for AFs as Supabase check failed.');
      return;
    }
  }

  if (supabaseAfsCount && supabaseAfsCount > 0) {
    console.log('seedAfs: AFs already seeded in Supabase. Count:', supabaseAfsCount);
    return;
  }
  console.log('seedAfs: Supabase AFs table is empty or check failed, attempting to seed.');

  let parsedAfs: Af[] = [];
  let source = '';

  // 2. Tenta carregar do public/data/afs.json
  try {
    console.log('seedAfs: Attempting to fetch from /data/afs.json');
    const response = await fetch('/data/afs.json'); // Caminho atualizado
    if (response.ok) {
      parsedAfs = await response.json();
      source = 'JSON';
      console.log('seedAfs: AFs loaded from JSON:', parsedAfs);
    } else {
      console.warn('seedAfs: Failed to fetch afs.json, trying CSV. Status:', response.status);
    }
  } catch (jsonError) {
    console.warn('seedAfs: Error fetching afs.json, trying CSV:', jsonError);
  }

  // 3. Se JSON falhou ou estava vazio, tenta carregar do public/afs.csv
  if (parsedAfs.length === 0) {
    try {
      console.log('seedAfs: Attempting to fetch from /afs.csv');
      const response = await fetch('/afs.csv');
      if (response.ok) {
        const csvText = await response.text();
        await new Promise<void>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              parsedAfs = results.data.map((row: any) => ({
                id: uuidv4(),
                af_number: row.af_number,
              }));
              source = 'CSV';
              console.log('seedAfs: AFs loaded from CSV:', parsedAfs);
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
      console.log('seedAfs: Upserting AFs into Supabase...');
      const { error: upsertError } = await supabase
        .from('afs')
        .upsert(parsedAfs, { onConflict: 'id' }); // Usando upsert para evitar duplicatas

      if (upsertError) {
        console.error('seedAfs: Failed to upsert AFs to Supabase:', upsertError);
        throw upsertError;
      }
      console.log(`seedAfs: AFs upserted from ${source} to Supabase.`);

      await bulkPutLocalAfs(parsedAfs); // Alterado para bulkPutLocalAfs
      console.log('seedAfs: AFs also seeded to IndexedDB.');
    } catch (dbError) {
      console.error("seedAfs: Failed to seed Supabase/IndexedDB with AFs:", dbError);
    }
  } else {
    console.warn('seedAfs: No AFs found in JSON or CSV to seed.');
  }
  console.log('--- Finished seedAfs process ---');
};

export const getParts = async (): Promise<Part[]> => {
  await seedPartsFromJson(); // Garante que o Supabase esteja populado

  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .limit(null); // Adicionado para remover o limite de 1000 registros

  if (error) {
    console.error('Error fetching parts from Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    console.log('Falling back to IndexedDB for parts.');
    return getLocalParts();
  }

  // Atualiza o cache local com os dados do Supabase
  await localDb.parts.clear();
  await bulkPutLocalParts(data as Part[]); // Alterado para bulkPutLocalParts
  return data as Part[];
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
    .limit(null); // Adicionado para remover o limite de 1000 registros

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
    console.log('Falling back to IndexedDB for search.');
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
    .limit(null); // Adicionado para remover o limite de 1000 registros

  if (error) {
    console.error('Error fetching AFs from Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    console.log('Falling back to IndexedDB for AFs.');
    return getLocalAfs();
  }

  // Atualiza o cache local com os dados do Supabase
  await localDb.afs.clear();
  await bulkPutLocalAfs(data as Af[]); // Alterado para bulkPutLocalAfs
  return data as Af[];
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
  console.log('getUniqueAfs: Calling getAfsFromService to ensure data is loaded and cached...');
  // Chama getAfsFromService para garantir que os AFs completos (com ID) sejam buscados e o cache local seja atualizado.
  const allAfs = await getAfsFromService(); 
  console.log('getUniqueAfs: All AFs (including IDs) fetched:', allAfs);
  // Mapeia para retornar apenas os números dos AFs, como esperado pela interface.
  return allAfs.map(af => af.af_number).sort();
};

// --- Novas funções para importação e exportação ---

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