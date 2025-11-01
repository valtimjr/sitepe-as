import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { CustomList, CustomListItem, MenuItem } from '@/types/supabase';

// --- Custom Lists Management ---

export const getCustomLists = async (userId: string): Promise<CustomList[]> => {
  const { data, error } = await supabase
    .from('custom_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom lists:', error);
    throw new Error(`Erro ao buscar listas personalizadas: ${error.message}`);
  }

  return data as CustomList[];
};

export const getCustomListById = async (listId: string): Promise<CustomList | null> => {
  const { data, error } = await supabase
    .from('custom_lists')
    .select('*')
    .eq('id', listId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching custom list by ID:', error);
    throw new Error(`Erro ao buscar lista personalizada por ID: ${error.message}`);
  }

  return data as CustomList | null;
};

export const getCustomListItems = async (listId: string): Promise<CustomListItem[]> => {
  const { data, error } = await supabase
    .from('custom_list_items')
    .select('*')
    .eq('list_id', listId)
    .order('order_index', { ascending: true }); // Ordena por order_index

  if (error) {
    console.error('Error fetching custom list items:', error);
    throw new Error(`Erro ao buscar itens da lista personalizada: ${error.message}`);
  }

  return data as CustomListItem[];
};

export const createCustomList = async (title: string, userId: string): Promise<CustomList> => {
  const { data, error } = await supabase
    .from('custom_lists')
    .insert({ title, user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom list:', error);
    throw new Error(`Erro ao criar lista personalizada: ${error.message}`);
  }

  return data as CustomList;
};

export const updateCustomList = async (list: CustomList): Promise<void> => {
  const { error } = await supabase
    .from('custom_lists')
    .update({ title: list.title })
    .eq('id', list.id);

  if (error) {
    console.error('Error updating custom list:', error);
    throw new Error(`Erro ao atualizar lista personalizada: ${error.message}`);
  }
};

export const deleteCustomList = async (listId: string): Promise<void> => {
  const { error } = await supabase
    .from('custom_lists')
    .delete()
    .eq('id', listId);

  if (error) {
    console.error('Error deleting custom list:', error);
    throw new Error(`Erro ao excluir lista personalizada: ${error.message}`);
  }
};

export const addCustomListItem = async (item: Omit<CustomListItem, 'id' | 'order_index'>): Promise<CustomListItem> => {
  // Determina o próximo order_index
  const { data: existingItems, error: fetchError } = await supabase
    .from('custom_list_items')
    .select('order_index')
    .eq('list_id', item.list_id)
    .order('order_index', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Error fetching max order_index for custom list item:', fetchError);
    throw new Error(`Erro ao determinar a ordem do item: ${fetchError.message}`);
  }

  const nextOrderIndex = (existingItems && existingItems.length > 0)
    ? existingItems[0].order_index + 1
    : 0; // Começa de 0 se não houver itens

  const newItem = { ...item, id: uuidv4(), order_index: nextOrderIndex };
  const { data, error } = await supabase
    .from('custom_list_items')
    .insert(newItem)
    .select()
    .single();

  if (error) {
    console.error('Error adding custom list item:', error);
    throw new Error(`Erro ao adicionar item à lista: ${error.message}`);
  }

  return data as CustomListItem;
};

export const updateCustomListItem = async (item: CustomListItem): Promise<void> => {
  const { error } = await supabase
    .from('custom_list_items')
    .update({ 
      item_name: item.item_name, 
      part_code: item.part_code, 
      description: item.description, 
      quantity: item.quantity,
      order_index: item.order_index, // Permite atualizar order_index
    })
    .eq('id', item.id);

  if (error) {
    console.error('Error updating custom list item:', error);
    throw new Error(`Erro ao atualizar item da lista: ${error.message}`);
  }
};

export const deleteCustomListItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from('custom_list_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting custom list item:', error);
    throw new Error(`Erro ao excluir item da lista: ${error.message}`);
  }
};

// --- Menu Structure Management ---

/**
 * Converte a lista plana de itens de menu em uma estrutura hierárquica.
 */
const buildMenuHierarchy = (items: MenuItem[]): MenuItem[] => {
  const map: { [key: string]: MenuItem } = {};
  const roots: MenuItem[] = [];

  items.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });

  items.forEach(item => {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children!.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  });

  // Ordena os filhos e as raízes
  const sortChildren = (menuItems: MenuItem[]) => {
    menuItems.sort((a, b) => a.order_index - b.order_index);
    menuItems.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
};

export const getMenuStructure = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_structure')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching menu structure:', error);
    // Retorna array vazio em caso de erro para não quebrar o app
    return [];
  }

  return buildMenuHierarchy(data as MenuItem[]);
};

export const getAllMenuItemsFlat = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_structure')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching flat menu items:', error);
    return [];
  }

  return data as MenuItem[];
};

export const createMenuItem = async (item: Omit<MenuItem, 'id' | 'created_at'>): Promise<MenuItem> => {
  const newItem = { ...item, id: uuidv4() };
  const { data, error } = await supabase
    .from('menu_structure')
    .insert(newItem)
    .select()
    .single();

  if (error) {
    console.error('Error creating menu item:', error);
    throw new Error(`Erro ao criar item de menu: ${error.message}`);
  }

  return data as MenuItem;
};

export const updateMenuItem = async (item: MenuItem): Promise<void> => {
  const { error } = await supabase
    .from('menu_structure')
    .update({ 
      parent_id: item.parent_id, 
      title: item.title, 
      order_index: item.order_index, 
      list_id: item.list_id 
    })
    .eq('id', item.id);

  if (error) {
    console.error('Error updating menu item:', error);
    throw new Error(`Erro ao atualizar item de menu: ${error.message}`);
  }
};

export const deleteMenuItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from('menu_structure')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting menu item:', error);
    throw new Error(`Erro ao excluir item de menu: ${error.message}`);
  }
};