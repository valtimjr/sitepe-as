import { supabase } from '@/integrations/supabase/client';
import { CompanyType } from '@/types/company';
import { SavedPartList, SavedPartListItem } from '@/types/supabase';
import { isOnline } from '@/services/localDbService';
import {
  LocalList,
  createList,
  getListsData,
  saveListsData,
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

export const deleteCloudList = async (cloudId: string): Promise<void> => {
  await ensureOnline();
  const { error } = await supabase.from('saved_part_lists').delete().eq('id', cloudId);
  if (error) throw error;
};

/**
 * Opens a cloud list locally: updates the linked local list if it exists, otherwise creates a new one.
 * The opened list becomes the active list.
 */
export const loadCloudListToLocal = async (company: CompanyType, cloudList: SavedPartList): Promise<LocalList> => {
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
  target.updatedAt = new Date().toISOString();
  data.activeListId = target.id;
  saveListsData(company, data);
  return target;
};
