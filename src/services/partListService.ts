import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import {
  localDb,
  getLocalUniqueAfs,
  bulkAddLocalParts,
  getLocalParts,
  searchLocalParts,
  updateLocalPart,
  bulkAddLocalAfs,
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
    // Se houver erro ao contar, tenta carregar do IndexedDB como fallback
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
    await bulkAddLocalParts(parsedParts);
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

      await bulkAddLocalAfs(parsedAfs);
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
    .select('*');

  if (error) {
    console.error('Error fetching parts from Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    console.log('Falling back to IndexedDB for parts.');
    return getLocalParts();
  }

  // Atualiza o cache local com os dados do Supabase
  await localDb.parts.clear();
  await bulkAddLocalParts(data as Part[]);
  return data as Part[];
};

export const searchParts = async (query: string): Promise<Part[]> => {
  await seedPartsFromJson(); // Garante que o Supabase esteja populado

  const lowerCaseQuery = query.toLowerCase().trim();

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

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching parts in Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    console.log('Falling back to IndexedDB for search.');
    return searchLocalParts(query); // Passa a query original para a busca local
  }

  let results = data as Part[];

  // Prioriza resultados: correspondência exata no código > começa com o código > inclui o código > outras correspondências
  if (lowerCaseQuery) {
    results.sort((a, b) => {
      const aCodigo = a.codigo.toLowerCase();
      const bCodigo = b.codigo.toLowerCase();

      const aMatchesExactCodigo = aCodigo === lowerCaseQuery;
      const bMatchesExactCodigo = bCodigo === lowerCaseQuery;

      const aStartsCodigo = aCodigo.startsWith(lowerCaseQuery);
      const bStartsCodigo = bCodigo.startsWith(lowerCaseQuery);

      const aIncludesCodigo = aCodigo.includes(lowerCaseQuery);
      const bIncludesCodigo = bCodigo.includes(lowerCaseQuery);

      // Correspondência exata no código primeiro
      if (aMatchesExactCodigo && !bMatchesExactCodigo) return -1;
      if (!aMatchesExactCodigo && bMatchesExactCodigo) return 1;

      // Depois, começa com o código
      if (aStartsCodigo && !bStartsCodigo) return -1;
      if (!aStartsCodigo && bStartsCodigo) return 1;

      // Depois, inclui o código
      if (aIncludesCodigo && !bIncludesCodigo) return -1;
      if (!aIncludesCodigo && bIncludesCodigo) return 1;

      // Fallback para a ordem original ou critérios secundários, se necessário
      return 0;
    });
  }

  return results;
};

export const updatePart = async (updatedPart: Part): Promise<void> => {
  // Atualiza no Supabase
  const { error: supabaseError } = await supabase
    .from('parts')
    .update({ tags: updatedPart.tags })
    .eq('id', updatedPart.id);

  if (supabaseError) {
    console.error('Error updating part in Supabase:', supabaseError);
    // Adicionado: Lança o erro para ser tratado no componente e mostrar um toast
    throw new Error(`Erro ao atualizar a peça no Supabase: ${supabaseError.message}`);
  }

  // Atualiza no IndexedDB
  await updateLocalPart(updatedPart);
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
  return addLocalServiceOrderItem(item, customCreatedAt);
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
  console.log('getUniqueAfs: Calling seedAfs...');
  await seedAfs(); // Garante que o Supabase esteja populado

  console.log('getUniqueAfs: Attempting to fetch AFs from Supabase...');
  const { data, error } = await supabase
    .from('afs')
    .select('af_number');

  if (error) {
    console.error('getUniqueAfs: Error fetching AFs from Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    console.log('getUniqueAfs: Falling back to IndexedDB for AFs.');
    const localAfs = await getLocalAfs();
    console.log('getUniqueAfs: AFs from IndexedDB (fallback):', localAfs);
    return localAfs.map(af => af.af_number).sort();
  }

  console.log('getUniqueAfs: AFs fetched from Supabase:', data);
  // Atualiza o cache local com os dados do Supabase
  await localDb.afs.clear();
  await bulkAddLocalAfs(data as Af[]); // data já é um array de { af_number: string }
  console.log('getUniqueAfs: IndexedDB AFs cache updated.');
  return data.map(af => af.af_number).sort();
};