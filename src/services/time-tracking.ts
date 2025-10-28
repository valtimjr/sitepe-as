import { supabase } from '@/integrations/supabase/client';
import {
  localDb,
  getLocalApontamentos,
  putLocalApontamento,
  bulkPutLocalApontamentos,
  clearLocalApontamentos,
  deleteLocalApontamentosByDateRange,
  Apontamento as LocalApontamento,
} from '@/services/localDbService';
import { isOnline } from './utils/network';

export interface Apontamento extends LocalApontamento {}

// Sincroniza dados do Supabase para o IndexedDB
export const syncApontamentosFromSupabase = async (userId: string): Promise<Apontamento[]> => {
  const { data, error } = await supabase
    .from('apontamentos')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching apontamentos from Supabase:', error);
    return getLocalApontamentos(userId);
  }

  const apontamentos = data.map(item => ({
    ...item,
    created_at: new Date(item.created_at),
    synced_at: new Date(),
  })) as Apontamento[];

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

  await putLocalApontamento(syncedApontamento);
  
  return syncedApontamento;
};

// Obtém itens não sincronizados localmente
export const getUnsyncedApontamentos = async (userId: string): Promise<Apontamento[]> => {
  return localDb.apontamentos.where('user_id').equals(userId).and(a => !a.synced_at).toArray();
};

// Tenta sincronizar todos os itens pendentes
export const syncPendingApontamentos = async (userId: string): Promise<number> => {
    const unsyncedItems = await getUnsyncedApontamentos(userId);
    if (unsyncedItems.length === 0) return 0;

    let syncedCount = 0;
    
    for (const item of unsyncedItems) {
        try {
            await syncApontamentoToSupabase(item);
            syncedCount++;
        } catch (e) {
            console.error(`Failed to sync item ${item.id}:`, e);
            break; 
        }
    }
    return syncedCount;
};


export const getApontamentos = async (userId: string): Promise<Apontamento[]> => {
  if (await isOnline()) {
      return await syncApontamentosFromSupabase(userId);
  }
  return getLocalApontamentos(userId);
};

export const updateApontamento = async (apontamento: Apontamento): Promise<Apontamento> => {
  const online = await isOnline();
  
  const localApontamento: Apontamento = {
    ...apontamento,
    synced_at: online ? new Date() : undefined,
  };

  await putLocalApontamento(localApontamento);

  if (online) {
    try {
      return await syncApontamentoToSupabase(localApontamento);
    } catch (e) {
      console.warn("Immediate Supabase sync failed, marking as unsynced locally.");
      const unsyncedLocal = { ...localApontamento, synced_at: undefined };
      await putLocalApontamento(unsyncedLocal);
      throw e; 
    }
  }
  
  return localApontamento;
};

export const deleteApontamento = async (id: string): Promise<void> => {
  const online = await isOnline();
  
  await localDb.apontamentos.delete(id);

  if (online) {
    const { error: supabaseError } = await supabase
      .from('apontamentos')
      .delete()
      .eq('id', id);

    if (supabaseError) {
      console.error('Error deleting apontamento from Supabase:', supabaseError);
      throw new Error(`Erro ao excluir apontamento do Supabase: ${supabaseError.message}`);
    }
  }
};

export const deleteApontamentosByMonth = async (userId: string, startDate: Date, endDate: Date): Promise<number> => {
  const startString = startDate.toISOString().split('T')[0];
  const endString = endDate.toISOString().split('T')[0];
  const online = await isOnline();
  
  const deletedLocalCount = await deleteLocalApontamentosByDateRange(userId, startString, endString);

  if (online) {
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