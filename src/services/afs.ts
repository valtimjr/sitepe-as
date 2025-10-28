import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import {
  localDb,
  bulkPutLocalAfs,
  getLocalAfs, // Exportado explicitamente
  Af as LocalAf,
} from '@/services/localDbService';
import { isOnline } from './utils/network';
import { fetchAllPaginated } from './utils/supabase-fetch';

export interface Af extends LocalAf {}

/**
 * Fetches AFs from local IndexedDB.
 */
export const getAfsFromLocal = async (): Promise<Af[]> => {
  return getLocalAfs();
};

/**
 * Fetches AFs from Supabase and updates the local IndexedDB cache.
 */
export const getAfsFromService = async (): Promise<Af[]> => {
  const online = await isOnline();
  
  if (!online) {
    console.log('Offline: Não é possível buscar AFs do Supabase.');
    return []; // Retorna vazio se offline e não pode buscar do Supabase
  }

  try {
    const remoteAfs = await fetchAllPaginated<Af>('afs', 'af_number');
    await localDb.afs.clear(); // Limpa o cache antigo
    await bulkPutLocalAfs(remoteAfs); // Atualiza o cache com os dados mais recentes
    console.log('Online: AFs buscados do Supabase e cache local atualizado.');
    return remoteAfs;
  } catch (error) {
    console.error('Online: Falha ao buscar AFs do Supabase. O cache local pode estar desatualizado.', error);
    throw new Error(`Erro ao buscar AFs do Supabase: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getAllAfsForExport = async (): Promise<Af[]> => {
  return fetchAllPaginated<Af>('afs', 'af_number');
};

export const addAf = async (af: Omit<Af, 'id'>): Promise<string> => {
  const newAf = { ...af, id: uuidv4() };
  const { data, error } = await supabase
    .from('afs')
    .insert(newAf)
    .select();

  if (error) {
    console.error('Error adding AF to Supabase:', error);
    throw new Error(`Erro ao adicionar AF no Supabase: ${error.message}`);
  }

  await localDb.afs.add(newAf);
  return data[0].id;
};

export const updateAf = async (updatedAf: Af): Promise<void> => {
  const { error: supabaseError } = await supabase
    .from('afs')
    .update({ af_number: updatedAf.af_number, descricao: updatedAf.descricao })
    .eq('id', updatedAf.id);

  if (supabaseError) {
    console.error('Error updating AF in Supabase:', supabaseError);
    throw new Error(`Erro ao atualizar AF no Supabase: ${supabaseError.message}`);
  }

  await localDb.afs.update(updatedAf.id, updatedAf);
};

export const deleteAf = async (id: string): Promise<void> => {
  const { error: supabaseError } = await supabase
    .from('afs')
    .delete()
    .eq('id', id);

  if (supabaseError) {
    console.error('Error deleting AF from Supabase:', supabaseError);
    throw new Error(`Erro ao excluir AF do Supabase: ${supabaseError.message}`);
  }

  await localDb.afs.delete(id);
};

export const importAfs = async (afs: Af[]): Promise<void> => {
  const { error: supabaseError } = await supabase
    .from('afs')
    .upsert(afs, { onConflict: 'af_number' });

  if (supabaseError) {
    console.error('Error importing AFs to Supabase:', supabaseError);
    throw new Error(`Erro ao importar AFs para o Supabase: ${supabaseError.message}`);
  }
  await bulkPutLocalAfs(afs);
};