import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { CustomList, CustomListItem, MenuItem, RelatedPart, RelatedItem, MangueiraItemData } from '@/types/supabase';
import { updatePart as updatePartService } from '@/services/partListService'; // Importa a função de update de peça

// Re-exporta updatePart para uso no formulário de item de lista
export const updatePart = updatePartService;

// --- Constantes para a tabela app_config ---
const APP_CONFIG_TABLE = 'app_config';
const MENU_STRUCTURE_KEY = 'menu_structure';

// --- Funções Auxiliares para Menu Structure (JSONB) ---

const parseRelatedItem = (item: RelatedItem): RelatedPart => {
  if (typeof item === 'string') {
    const parts = item.split('|');
    return {
      codigo: parts[0] || '',
      name: parts[1] || '',
      desc: parts[2] || '',
    };
  }
  return item;
};

/**
 * Converte a lista plana de itens de menu em uma estrutura hierárquica.
 * Adiciona 'itens_relacionados' se ausente e converte strings para objetos.
 */
const buildMenuHierarchy = (items: MenuItem[]): MenuItem[] => {
  const map: { [key: string]: MenuItem } = {};
  const roots: MenuItem[] = [];

  items.forEach(item => {
    map[item.id] = { 
      ...item, 
      children: [], 
      itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem)
    };
  });

  items.forEach(item => {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children!.push(map[item.id]);
    } else if (!item.parent_id) {
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

/**
 * Converte a estrutura hierárquica de menu em uma lista plana.
 * Garante que 'itens_relacionados' esteja presente e no formato de objeto.
 */
const flattenMenuHierarchy = (hierarchy: MenuItem[]): MenuItem[] => {
  const flatList: MenuItem[] = [];
  const traverse = (items: MenuItem[]) => {
    items.forEach(item => {
      const { children, ...rest } = item;
      flatList.push({ ...rest, itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem) });
      if (children && children.length > 0) {
        traverse(children);
      }
    });
  };
  traverse(hierarchy);
  return flatList;
};

/**
 * Salva a estrutura completa do menu no Supabase (uma única linha JSONB).
 * @param flatItems A flat array of all menu items.
 */
export const saveAllMenuItems = async (flatItems: MenuItem[]): Promise<void> => {
  const { error } = await supabase
    .from(APP_CONFIG_TABLE)
    .upsert({ key: MENU_STRUCTURE_KEY, value: flatItems, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    throw new Error(`Erro ao salvar estrutura do menu: ${error.message}`);
  }
};

/**
 * Busca a estrutura completa do menu do Supabase (uma única linha JSONB).
 * Se não existir, tenta migrar de uma estrutura antiga ou retorna um array vazio.
 */
export const getMenuStructure = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from(APP_CONFIG_TABLE)
    .select('value')
    .eq('key', MENU_STRUCTURE_KEY)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`Error fetching menu structure from app_config: ${error.message}`);
  }

  let flatItems: MenuItem[] = (data?.value as MenuItem[]) || [];

  // Migração de dados da estrutura antiga (se existir e a nova estiver vazia)
  if (flatItems.length === 0) {
    try {
      const { data: oldMenuItems, error: oldError } = await supabase
        .from('menu_structure') // Tenta ler da tabela antiga
        .select('*')
        .order('order_index', { ascending: true });

      if (!oldError && oldMenuItems && oldMenuItems.length > 0) {
        flatItems = oldMenuItems.map(item => ({
          id: item.id,
          parent_id: item.parent_id,
          title: item.title,
          order_index: item.order_index,
          list_id: item.list_id,
          itens_relacionados: [], // Inicializa o novo campo
        }));
        // Salva a estrutura migrada no novo formato
        await saveAllMenuItems(flatItems);
      }
    } catch (e) {
      // console.warn('Old menu_structure table not found or error during migration attempt:', e);
    }
  }

  // Injeta os subtítulos como subitens
  const itemsWithList = flatItems.filter(item => item.list_id); // CORRIGIDO: Pega TODOS os itens com lista
  if (itemsWithList.length > 0) {
    const listIds = itemsWithList.map(item => item.list_id!);
    const { data: lists, error: listsError } = await supabase
      .from('custom_lists')
      .select('id, items_data')
      .in('id', listIds);

    if (listsError) {
      console.error('Error fetching custom lists for menu subtitles:', listsError);
    } else if (lists) {
      const subtitlesToAdd: MenuItem[] = [];
      itemsWithList.forEach(menuItem => {
        const list = lists.find(l => l.id === menuItem.list_id);
        if (list && list.items_data) {
          const subtitles = list.items_data
            .filter(item => item.type === 'subtitle')
            .sort((a, b) => a.order_index - b.order_index);
          
          subtitles.forEach((subtitle, index) => {
            subtitlesToAdd.push({
              id: `${menuItem.id}-${subtitle.id}`, // ID único para o subitem
              parent_id: menuItem.id,
              title: subtitle.item_name,
              order_index: index,
              list_id: menuItem.list_id,
              hash: subtitle.id, // A âncora para o scroll
              itens_relacionados: [],
            });
          });
        }
      });
      flatItems = [...flatItems, ...subtitlesToAdd];
    }
  }

  return buildMenuHierarchy(flatItems);
};

/**
 * Retorna todos os itens de menu em uma lista plana.
 * Garante que 'itens_relacionados' esteja presente e no formato de objeto.
 */
export const getAllMenuItemsFlat = async (): Promise<MenuItem[]> => {
  const hierarchy = await getMenuStructure();
  return flattenMenuHierarchy(hierarchy);
};

export const createMenuItem = async (item: Omit<MenuItem, 'id' | 'created_at'>): Promise<MenuItem> => {
  const currentFlatItems = await getAllMenuItemsFlat();
  const newItem: MenuItem = { 
    ...item, 
    id: uuidv4(), 
    order_index: item.order_index ?? currentFlatItems.length,
    itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem), // Garante o formato
  };
  const updatedFlatItems = [...currentFlatItems, newItem];
  await saveAllMenuItems(updatedFlatItems);
  return newItem;
};

export const updateMenuItem = async (item: MenuItem): Promise<void> => {
  const currentFlatItems = await getAllMenuItemsFlat();
  const updatedFlatItems = currentFlatItems.map(existingItem =>
    existingItem.id === item.id ? { ...item, itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem) } : existingItem
  );
  await saveAllMenuItems(updatedFlatItems);
};

export const deleteMenuItem = async (itemId: string): Promise<void> => {
  const currentFlatItems = await getAllMenuItemsFlat();
  const itemsToDelete = new Set<string>();
  itemsToDelete.add(itemId);

  // Função recursiva para encontrar todos os filhos a serem deletados
  const findChildrenToDelete = (parentId: string) => {
    currentFlatItems.filter(item => item.parent_id === parentId).forEach(child => {
      itemsToDelete.add(child.id);
      findChildrenToDelete(child.id);
    });
  };
  findChildrenToDelete(itemId);

  const updatedFlatItems = currentFlatItems.filter(item => !itemsToDelete.has(item.id));
  await saveAllMenuItems(updatedFlatItems);
};

// --- Custom Lists Management ---

export const getCustomLists = async (userId: string): Promise<CustomList[]> => {
  const { data, error } = await supabase
    .from('custom_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar listas personalizadas: ${error.message}`);
  }

  // Migração de dados de custom_list_items para items_data (se items_data estiver vazio)
  const listsWithMigratedItems = await Promise.all((data as CustomList[]).map(async (list) => {
    if (!list.items_data || list.items_data.length === 0) {
      try {
        const { data: oldListItems, error: oldError } = await supabase
          .from('custom_list_items') // Tenta ler da tabela antiga
          .select('*')
          .eq('list_id', list.id)
          .order('order_index', { ascending: true });

        if (!oldError && oldMenuItems && oldMenuItems.length > 0) {
          // console.log(`Migrating old custom_list_items for list ${list.id} to items_data JSONB format...`);
          const migratedItems: CustomListItem[] = oldListItems.map(item => ({
            id: item.id,
            item_name: item.item_name,
            part_code: item.part_code,
            description: item.description,
            quantity: item.quantity,
            order_index: item.order_index,
            itens_relacionados: [], // Inicializa o novo campo
            type: 'item', // Define o tipo padrão
          }));
          // Salva a lista com os itens migrados no novo formato
          await supabase
            .from('custom_lists')
            .update({ items_data: migratedItems, updated_at: new Date().toISOString() }) // Inclui updated_at
            .eq('id', list.id);
          // console.log(`Custom_list_items migration complete for list ${list.id}.`);
          return { ...list, items_data: migratedItems };
        }
      } catch (e) {
        // console.warn('Old custom_list_items table not found or error during migration attempt:', e);
      }
    }
    // Garante que os itens existentes também sejam padronizados
    if (list.items_data) {
      list.items_data = list.items_data.map(item => ({
        ...item,
        itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem)
      }));
    }
    return list;
  }));

  return listsWithMigratedItems;
};

export const getCustomListById = async (listId: string): Promise<CustomList | null> => {
  const { data, error } = await supabase
    .from('custom_lists')
    .select('*')
    .eq('id', listId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar lista personalizada por ID: ${error.message}`);
  }

  const list = data as CustomList | null;
  if (list && list.items_data) {
    list.items_data = list.items_data.map(item => ({
      ...item,
      itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem)
    }));
  }

  return list;
};

export const getCustomListItems = async (listId: string): Promise<CustomListItem[]> => {
  const list = await getCustomListById(listId);
  if (!list || !list.items_data) {
    return [];
  }
  // Garante que 'itens_relacionados' e 'type' estejam presentes em cada item
  return list.items_data.map(item => ({ 
      ...item, 
      type: item.type || 'item', // Adiciona 'item' como tipo padrão se ausente
      itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem)
    }))
    .sort((a, b) => a.order_index - b.order_index);
};

export const createCustomList = async (title: string, userId: string): Promise<CustomList> => {
  const { data, error } = await supabase
    .from('custom_lists')
    .insert({ title, user_id: userId, items_data: [] }) // Inicializa items_data vazio
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar lista personalizada: ${error.message}`);
  }

  return data as CustomList;
};

/**
 * Atualiza os metadados da lista (título) ou o array completo de itens.
 * @param list O objeto CustomList completo com os dados atualizados.
 */
export const updateCustomList = async (list: CustomList): Promise<void> => {
  const { error } = await supabase
    .from('custom_lists')
    .update({ title: list.title, items_data: list.items_data, updated_at: new Date().toISOString() }) // Inclui updated_at
    .eq('id', list.id);

  if (error) {
    throw new Error(`Erro ao atualizar lista personalizada: ${error.message}`);
  }
};

/**
 * Atualiza um único item dentro do array items_data de uma lista.
 * Esta função agora é mais segura contra race conditions se usada corretamente.
 * @param listId O ID da lista.
 * @param item O item CustomListItem completo com os dados atualizados.
 */
export const updateCustomListItem = async (listId: string, item: CustomListItem): Promise<void> => {
  const currentList = await getCustomListById(listId);
  if (!currentList) throw new Error('Lista personalizada não encontrada.');

  // Normaliza campos baseados no tipo
  const normalizedItem: CustomListItem = {
    ...item,
    itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem),
    // Limpa campos de item simples se for mangueira
    part_code: item.type === 'item' ? item.part_code : null,
    description: item.type === 'item' ? item.description : null,
    quantity: item.type === 'item' ? item.quantity : 0,
    // Limpa campos de mangueira se não for mangueira
    mangueira_data: item.type === 'mangueira' ? item.mangueira_data : undefined,
  };

  const updatedItems = (currentList.items_data || []).map(existingItem =>
    existingItem.id === item.id ? normalizedItem : existingItem
  );

  await updateCustomList({ ...currentList, items_data: updatedItems });
};

/**
 * Atualiza o array completo de itens para uma lista específica.
 * Esta é a função que será usada para reordenação.
 * @param listId O ID da lista.
 * @param updatedItems O array completo de CustomListItem[] com a nova ordem e order_index.
 */
export const updateAllCustomListItems = async (listId: string, updatedItems: CustomListItem[]): Promise<void> => {
  const currentList = await getCustomListById(listId);
  if (!currentList) throw new Error('Lista personalizada não encontrada.');

  // Garante que todos os itens no array recebido tenham list_id e itens_relacionados
  const itemsToSave = updatedItems.map(item => ({
    ...item,
    itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem),
  }));

  await updateCustomList({ ...currentList, items_data: itemsToSave });
};


export const deleteCustomList = async (listId: string): Promise<void> => {
  const { error } = await supabase
    .from('custom_lists')
    .delete()
    .eq('id', listId);

  if (error) {
    throw new Error(`Erro ao excluir lista personalizada: ${error.message}`);
  }
};

export const addCustomListItem = async (listId: string, item: Omit<CustomListItem, 'id'>): Promise<CustomListItem> => {
  const currentList = await getCustomListById(listId);
  if (!currentList) throw new Error('Lista personalizada não encontrada.');

  const currentItems = currentList.items_data || [];
  
  // Normaliza campos baseados no tipo
  const normalizedItem: Omit<CustomListItem, 'id'> = {
    ...item,
    order_index: currentItems.length > 0 ? Math.max(...currentItems.map(i => i.order_index)) + 1 : 0,
    itens_relacionados: (item.itens_relacionados || []).map(parseRelatedItem),
    // Limpa campos de item simples se for mangueira
    part_code: item.type === 'item' ? item.part_code : null,
    description: item.type === 'item' ? item.description : null,
    quantity: item.type === 'item' ? item.quantity : 0,
    // Limpa campos de mangueira se não for mangueira
    mangueira_data: item.type === 'mangueira' ? item.mangueira_data : undefined,
  };

  const newItem: CustomListItem = { 
    ...normalizedItem, 
    id: uuidv4(), 
  };
  const updatedItems = [...currentItems, newItem];
  
  await updateCustomList({ ...currentList, items_data: updatedItems });
  return newItem;
};

export const deleteCustomListItem = async (listId: string, itemId: string): Promise<void> => {
  const currentList = await getCustomListById(listId);
  if (!currentList) throw new Error('Lista personalizada não encontrada.');

  const updatedItems = (currentList.items_data || []).filter(item => item.id !== itemId);
  // Reajusta order_index após a exclusão
  const reindexedItems = updatedItems.map((item, index) => ({ ...item, order_index: index }));

  await updateCustomList({ ...currentList, items_data: reindexedItems });
};

// REMOVIDO: Funções de Custom List Item Relations não são mais necessárias
// getCustomListItemRelations, addCustomListItemRelation, deleteCustomListItemRelation

// --- Menu Structure Management (Funções já atualizadas acima) ---
// getMenuStructure, getAllMenuItemsFlat, createMenuItem, updateMenuItem, deleteMenuItem