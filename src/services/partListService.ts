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
    const response = await fetch('/src/data/parts.json');
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

const seedAfsFromCsv = async (): Promise<void> => {
  // Primeiro, verifica se há AFs no Supabase
  const { count: supabaseAfsCount, error: countError } = await supabase
    .from('afs')
    .select('*', { count: 'exact' });

  if (countError) {
    console.error('Error checking Supabase AFs count:', countError);
    // Se houver erro ao contar, tenta carregar do IndexedDB como fallback
    const localAfsCount = await localDb.afs.count();
    if (localAfsCount > 0) {
      console.log('Falling back to IndexedDB for AFs as Supabase check failed.');
      return;
    }
  }

  if (supabaseAfsCount && supabaseAfsCount > 0) {
    console.log('AFs already seeded in Supabase.');
    return;
  }

  try {
    const response = await fetch('/afs.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    await new Promise<void>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          const parsedAfs: Af[] = results.data.map((row: any) => ({
            id: uuidv4(), // Gerar UUID para o Supabase
            af_number: row.af_number,
          }));

          // Adiciona ao Supabase
          const { error: insertError } = await supabase
            .from('afs')
            .insert(parsedAfs);

          if (insertError) {
            console.error('Failed to seed AFs to Supabase:', insertError);
            reject(insertError);
            return;
          }
          console.log('AFs seeded from CSV to Supabase.');

          // Também adiciona ao IndexedDB para cache local
          await bulkAddLocalAfs(parsedAfs);
          console.log('AFs also seeded to IndexedDB.');
          resolve();
        },
        error: (error: Error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Failed to fetch or parse afs.csv or seed Supabase/IndexedDB:", error);
  }
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

  const lowerCaseQuery = query.toLowerCase();

  let queryBuilder = supabase
    .from('parts')
    .select('*');

  if (query) {
    // Correção: Usar o método 'or' com uma string de condições 'ilike'
    queryBuilder = queryBuilder.or(
      `codigo.ilike.%${lowerCaseQuery}%,descricao.ilike.%${lowerCaseQuery}%,tags.ilike.%${lowerCaseQuery}%`
    );
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching parts in Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    console.log('Falling back to IndexedDB for search.');
    return searchLocalParts(query);
  }

  return data as Part[];
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
  await deleteServiceOrderItem(id);
};

export const clearServiceOrderList = async (): Promise<void> => {
  await clearLocalServiceOrderItems();
};

export const getUniqueAfs = async (): Promise<string[]> => {
  await seedAfsFromCsv(); // Garante que o Supabase esteja populado

  const { data, error } = await supabase
    .from('afs')
    .select('af_number');

  if (error) {
    console.error('Error fetching AFs from Supabase:', error);
    // Fallback para IndexedDB se Supabase falhar
    console.log('Falling back to IndexedDB for AFs.');
    const localAfs = await getLocalAfs();
    return localAfs.map(af => af.af_number).sort();
  }

  // Atualiza o cache local com os dados do Supabase
  await localDb.afs.clear();
  await bulkAddLocalAfs(data as Af[]); // data já é um array de { af_number: string }
  return data.map(af => af.af_number).sort();
};