import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import {
  localDb,
  bulkPutLocalAfs,
  getLocalAfs,
  Af as LocalAf,
} from '@/services/localDbService';
import { isOnline } from './utils/network';
import { fetchAllPaginated } from './utils/supabase-fetch';

export interface Af extends LocalAf {}

/**
 * Returns AFs from local cache immediately and starts background sync if online.
 */
export const getAfsFromService = async (): Promise<Af[]> => {
  const online = await isOnline();
  const localAfs = await getLocalAfs();
  
  if (!online) {
    console.log('Offline: Serving AFs from local cache.');
    return localAfs;
  }

  const syncPromise = fetchAllPaginated<Af>('afs', 'af_number')
    .then(async (data) => {
      await localDb.afs.clear();
      await bulkPutLocalAfs(data);
      console.log('Background sync of AFs complete.');
      return data;
    })
    .catch(error => {
      console.error('Background sync of AFs failed:', error);
      return localAfs;
    });
      
  return localAfs.length > 0 ? localAfs : syncPromise;
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