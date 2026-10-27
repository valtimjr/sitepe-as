import { supabase } from '@/integrations/supabase/client';
import { CompanyType } from '@/types/company';
import { SavedPartList, SavedPartListItem } from '@/types/supabase';
import { isOnline } from '@/services/localDbService';
import {
  LocalList,
  createList,
  getListsData,
  saveListsData,
  setListCloudId,
} from '@/services/localListStorage';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeListIcon } from '@/types/listIcon';

const OFFLINE_MESSAGE = 'Sem conexão com a internet. Tente novamente quando estiver online.';

const ensureOnline = async () => {
  if (!(await isOnline())) throw new Error(OFFLINE_MESSAGE);
};

export const toCloudItems = (list: LocalList): SavedPartListItem[] =>
  list.items.map(item => ({
    codigo_peca: item.codigo_peca || '',
    descricao: item.descricao || '',
    quantidade: item.quantidade ?? 1,
    af: item.af || '',
  }));

export const getCloudLists = async (userId: string, company: CompanyType): Promise<SavedPartList[]> => {
  await ensureOnline();
  const { data, error } = await supabase
    .from('saved_part_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('company', company)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as SavedPartList[];
};

export const saveListToCloud = async (userId: string, company: CompanyType, list: LocalList): Promise<SavedPartList> => {
  await ensureOnline();
  const { data, error } = await supabase
    .from('saved_part_lists')
    .insert({
      user_id: userId,
      company,
      name: list.name,
      local_list_id: list.id,
      items: toCloudItems(list),
      icon: list.icon ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SavedPartList;
};

export const updateCloudList = async (cloudId: string, list: LocalList): Promise<SavedPartList | null> => {
  await ensureOnline();
  const { data, error } = await supabase
    .from('saved_part_lists')
    .update({ name: list.name, local_list_id: list.id, items: toCloudItems(list), icon: list.icon ?? null })
    .eq('id', cloudId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return (data as SavedPartList) || null;
};

export const getCloudList = async (cloudId: string): Promise<SavedPartList | null> => {
  await ensureOnline();
  const { data, error } = await supabase.from('saved_part_lists').select('*').eq('id', cloudId).maybeSingle();
  if (error) throw error;
  return (data as SavedPartList) || null;
};

const findLocalList = async (company: CompanyType, listId: string): Promise<LocalList> => {
  const list = (await getListsData(company)).lists.find(l => l.id === listId);
  if (!list) throw new Error('Lista não encontrada.');
  return list;
};

/** Envia a versão local para a nuvem (atualiza a cópia vinculada ou cria uma nova). */
export const pushListToCloud = async (
  userId: string,
  company: CompanyType,
  listId: string
): Promise<'updated' | 'created'> => {
  const list = await findLocalList(company, listId);
  if (list.cloudId) {
    const updated = await updateCloudList(list.cloudId, list);
    if (updated) {
      await setListCloudId(company, list.id, updated.id, updated.updated_at);
      return 'updated';
    }
  }
  const saved = await saveListToCloud(userId, company, list);
  await setListCloudId(company, list.id, saved.id, saved.updated_at);
  return 'created';
};

export type SyncResult = 'pushed' | 'pulled' | 'created' | 'in-sync';

/**
 * Sincroniza uma lista com a nuvem: a versão mais nova (local ou nuvem) prevalece.
 */
export const syncListWithCloud = async (userId: string, company: CompanyType, listId: string): Promise<SyncResult> => {
  const list = await findLocalList(company, listId);
  const cloud = list.cloudId ? await getCloudList(list.cloudId) : null;
  if (!cloud) {
    await pushListToCloud(userId, company, listId);
    return 'created';
  }

  const localTime = Date.parse(list.updatedAt) || 0;
  const cloudTime = Date.parse(cloud.updated_at || cloud.created_at || '') || 0;

  let direction: 'push' | 'pull';
  if (list.syncedAt && list.cloudUpdatedAt) {
    const localChanged = localTime > Date.parse(list.syncedAt);
    const cloudChanged = cloudTime > Date.parse(list.cloudUpdatedAt);
    if (!localChanged && !cloudChanged) return 'in-sync';
    if (localChanged !== cloudChanged) direction = localChanged ? 'push' : 'pull';
    else direction = localTime >= cloudTime ? 'push' : 'pull';
  } else {
    direction = localTime >= cloudTime ? 'push' : 'pull';
  }

  if (direction === 'push') {
    await pushListToCloud(userId, company, listId);
    return 'pushed';
  }
  await loadCloudListToLocal(company, cloud, { activate: false });
  return 'pulled';
};

export const deleteCloudList = async (cloudId: string): Promise<void> => {
  await ensureOnline();
  const { error } = await supabase.from('saved_part_lists').delete().eq('id', cloudId);
  if (error) throw error;
};

/**
 * Opens a cloud list locally: updates the linked local list if it exists, otherwise creates a new one.
 * The opened list becomes the active list.
 */
export const loadCloudListToLocal = async (
  company: CompanyType,
  cloudList: SavedPartList,
  options: { activate?: boolean } = {}
): Promise<LocalList> => {
  let data = await getListsData(company);
  let target = data.lists.find(l => l.cloudId === cloudList.id);

  if (!target) {
    const created = await createList(company, cloudList.name);
    data = await getListsData(company);
    target = data.lists.find(l => l.id === created.id)!;
  }

  target.name = cloudList.name;
  target.cloudId = cloudList.id;
  const icon = sanitizeListIcon(cloudList.icon);
  if (icon) target.icon = icon;
  else delete target.icon;
  target.items = (cloudList.items || []).map(item => ({
    id: uuidv4(),
    codigo_peca: item.codigo_peca || '',
    descricao: item.descricao || '',
    quantidade: Number(item.quantidade) > 0 ? Number(item.quantidade) : 1,
    af: item.af || undefined,
    created_at: new Date(),
    company,
  }));
  const now = new Date().toISOString();
  target.updatedAt = now;
  target.syncedAt = now;
  if (cloudList.updated_at) target.cloudUpdatedAt = cloudList.updated_at;
  if (options.activate !== false) data.activeListId = target.id;
  saveListsData(company, data);
  return target;
};
