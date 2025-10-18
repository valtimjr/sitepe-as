import { supabase } from '@/integrations/supabase/client'; // Importa o cliente Supabase

export interface Part {
  id: string; // Adicionado id para consistência com o banco de dados e para chaves React
  codigo: string;
  descricao: string;
}

export interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
  user_id?: string; // Adiciona user_id para associar itens a usuários
}

// --- Parts Management (Supabase) ---

export const getParts = async (): Promise<Part[]> => {
  const { data, error } = await supabase
    .from('parts')
    .select('id, codigo, descricao'); // Seleciona o id também

  if (error) {
    console.error('Error fetching parts:', error);
    return [];
  }
  return data || [];
};

export const insertPart = async (part: Part): Promise<void> => {
  const { error } = await supabase
    .from('parts')
    .upsert(part, { onConflict: 'codigo' }); // Usa upsert para inserir ou atualizar

  if (error) {
    console.error('Error inserting/updating part:', error);
    throw error;
  }
};

export const searchParts = async (query: string): Promise<Part[]> => {
  if (!query || query.trim() === '') {
    return getParts(); // Retorna todas as peças se a query estiver vazia
  }

  const trimmedQuery = query.trim();
  const keywords = trimmedQuery.split('%').map(k => k.trim()).filter(k => k.length > 0);

  if (keywords.length === 0) {
    return getParts(); // Se não houver palavras-chave válidas após a divisão, retorna todas as peças
  }

  let queryBuilder = supabase
    .from('parts')
    .select('id, codigo, descricao'); // Seleciona o id também

  const conditions: string[] = [];
  keywords.forEach(keyword => {
    const lowerCaseKeyword = keyword.toLowerCase();
    conditions.push(`codigo.ilike.%${lowerCaseKeyword}%`);
    conditions.push(`descricao.ilike.%${lowerCaseKeyword}%`);
  });

  if (conditions.length > 0) {
    queryBuilder = queryBuilder.or(conditions.join(','));
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching parts:', error);
    return [];
  }
  return data || [];
};

// --- List Items Management (Supabase) ---

export const getListItems = async (): Promise<ListItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('No authenticated user found for list items.');
    return [];
  }

  const { data, error } = await supabase
    .from('list_items')
    .select('id, codigo_peca, descricao, quantidade, af, user_id')
    .eq('user_id', user.id); // Filtra por user_id

  if (error) {
    console.error('Error fetching list items:', error);
    return [];
  }
  return data || [];
};

export const addItemToList = async (item: Omit<ListItem, 'id' | 'user_id'>): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated. Cannot add item to list.');
  }

  const { error } = await supabase
    .from('list_items')
    .insert({ ...item, user_id: user.id });

  if (error) {
    console.error('Error adding item to list:', error);
    throw error;
  }
};

export const updateListItem = async (updatedItem: ListItem): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated. Cannot update item.');
  }

  const { error } = await supabase
    .from('list_items')
    .update(updatedItem)
    .eq('id', updatedItem.id)
    .eq('user_id', user.id); // Garante que o usuário só atualize seus próprios itens

  if (error) {
    console.error('Error updating list item:', error);
    throw error;
  }
};

export const deleteListItem = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated. Cannot delete item.');
  }

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // Garante que o usuário só delete seus próprios itens

  if (error) {
    console.error('Error deleting list item:', error);
    throw error;
  }
};

export const clearList = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated. Cannot clear list.');
  }

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('user_id', user.id); // Limpa apenas os itens do usuário atual

  if (error) {
    console.error('Error clearing list:', error);
    throw error;
  }
};

export const getUniqueAfs = async (): Promise<string[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('No authenticated user found for unique AFs.');
    return [];
  }

  const { data, error } = await supabase
    .from('list_items')
    .select('af')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching unique AFs:', error);
    return [];
  }
  const afs = new Set<string>();
  data?.forEach(item => {
    if (item.af) {
      afs.add(item.af);
    }
  });
  return Array.from(afs).sort();
};