import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { CustomList, CustomListItem, MenuItem, CustomListItemRelation } from '@/types/supabase';

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

// NOVA FUNÇÃO: Busca itens relacionados em outras listas
export const getRelatedCustomListItems = async (
  partCode: string | null,
  itemName: string, // Este parâmetro não será mais usado para a busca, mas mantido na assinatura.
  excludeItemId: string,
  excludeListId: string // Este parâmetro será ignorado para filtrar por list_id, conforme solicitado
): Promise<CustomListItem[]> => {
  console.log('getRelatedCustomListItems: Called with:', { partCode, itemName, excludeItemId, excludeListId });

  if (!partCode) {
    console.log('getRelatedCustomListItems: No partCode, returning empty array.');
    return [];
  }

  let partIdsToSearchInRelations: string[] = [];
  let partCodesToSearchInCustomListItems: string[] = [partCode]; // Always include the original partCode

  // Step 1: Find the source Part from the 'parts' table using the provided partCode.
  const { data: sourcePartData, error: sourcePartError } = await supabase
    .from('parts')
    .select('id, codigo, name, descricao, tags')
    .eq('codigo', partCode)
    .limit(1);

  if (sourcePartError && sourcePartError.code !== 'PGRST116') {
    console.error('getRelatedCustomListItems: Error fetching source part ID for partCode:', sourcePartError);
  } else if (sourcePartData && sourcePartData.length > 0) {
    const sourcePart = sourcePartData[0];
    partIdsToSearchInRelations.push(sourcePart.id);
    console.log('getRelatedCustomListItems: Found source part_id:', sourcePart.id, 'and details:', sourcePart);

    // Step 2: Find other "related" Parts based on tags or name/description similarity.
    // This is the "buscados diretos na tabela parts" part.
    let relatedPartsQueryConditions: string[] = [];
    if (sourcePart.tags && sourcePart.tags.trim().length > 0) {
      const tagsArray = sourcePart.tags.split(';').map(tag => tag.trim()).filter(Boolean);
      if (tagsArray.length > 0) {
        relatedPartsQueryConditions.push(`tags.ilike.%${tagsArray.join('%|%')}%`); // Match any of the tags
      }
    }
    if (sourcePart.name && sourcePart.name.trim().length > 0) {
      relatedPartsQueryConditions.push(`name.ilike.%${sourcePart.name.trim()}%`);
    }
    if (sourcePart.descricao && sourcePart.descricao.trim().length > 0) {
      relatedPartsQueryConditions.push(`descricao.ilike.%${sourcePart.descricao.trim()}%`);
    }

    if (relatedPartsQueryConditions.length > 0) {
      const { data: similarPartsData, error: similarPartsError } = await supabase
        .from('parts')
        .select('codigo')
        .or(relatedPartsQueryConditions.join(','))
        .neq('id', sourcePart.id) // Exclude the source part itself
        .limit(10); // Limit to a reasonable number of similar parts

      if (similarPartsError) {
        console.error('getRelatedCustomListItems: Error fetching similar parts:', similarPartsError);
      } else if (similarPartsData && similarPartsData.length > 0) {
        similarPartsData.forEach(p => {
          if (!partCodesToSearchInCustomListItems.includes(p.codigo)) {
            partCodesToSearchInCustomListItems.push(p.codigo);
          }
        });
        console.log('getRelatedCustomListItems: Found similar part codes:', similarPartsData.map(p => p.codigo));
      }
    }
  } else {
    console.log('getRelatedCustomListItems: No source part_id found for partCode:', partCode);
  }

  // Step 3: Find custom_list_item_ids from custom_list_item_relations using the source part_id.
  let relatedItemIdsFromRelations: string[] = [];
  if (partIdsToSearchInRelations.length > 0) {
    const { data: relationsData, error: relationsError } = await supabase
      .from('custom_list_item_relations')
      .select('custom_list_item_id')
      .in('part_id', partIdsToSearchInRelations);

    if (relationsError) {
      console.error('getRelatedCustomListItems: Error fetching custom_list_item_ids from relations:', relationsError);
    } else if (relationsData && relationsData.length > 0) {
      relatedItemIdsFromRelations = relationsData.map(r => r.custom_list_item_id);
      console.log('getRelatedCustomListItems: Found relatedItemIdsFromRelations:', relatedItemIdsFromRelations);
    } else {
      console.log('getRelatedCustomListItems: No custom_list_item_ids found in relations for part_id(s):', partIdsToSearchInRelations);
    }
  }

  // Step 4: Build the main query for custom_list_items.
  let finalQueryConditions: string[] = [];

  // Condition A: Direct match on custom_list_items.part_code for the source part and similar parts.
  if (partCodesToSearchInCustomListItems.length > 0) {
    finalQueryConditions.push(`part_code.in.(${partCodesToSearchInCustomListItems.join(',')})`);
  }
  
  // Condition B: Match by custom_list_item_id found via relations (if any).
  if (relatedItemIdsFromRelations.length > 0) {
    finalQueryConditions.push(`id.in.(${relatedItemIdsFromRelations.join(',')})`);
  }

  if (finalQueryConditions.length === 0) {
    console.log('getRelatedCustomListItems: No final query conditions generated.');
    return [];
  }

  const finalQueryOrString = finalQueryConditions.join(',');
  console.log('getRelatedCustomListItems: Final Supabase .or() query string:', finalQueryOrString);

  const { data, error } = await supabase
    .from('custom_list_items')
    .select('*, custom_lists(title)')
    .or(finalQueryOrString) // Combine all conditions with OR
    .neq('id', excludeItemId) // Exclude the original item itself
    .limit(5); // Limit the number of results

  if (error) {
    console.error('getRelatedCustomListItems: Error fetching final related custom list items:', error);
    return [];
  }

  console.log('getRelatedCustomListItems: Raw data from Supabase:', data);

  // Deduplicate results if any item was matched by multiple conditions
  const uniqueItemsMap = new Map<string, CustomListItem>();
  data.forEach(item => uniqueItemsMap.set(item.id, {
    ...item,
    list_title: item.custom_lists?.title || 'Lista Desconhecida'
  }));

  return Array.from(uniqueItemsMap.values());
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

// --- Custom List Item Relations Management ---

export const getCustomListItemRelations = async (customListItemId: string): Promise<CustomListItemRelation[]> => {
  const { data, error } = await supabase
    .from('custom_list_item_relations')
    .select(`
      id,
      custom_list_item_id,
      part_id,
      quantity,
      created_at,
      parts (
        codigo,
        name,
        descricao
      )
    `)
    .eq('custom_list_item_id', customListItemId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getCustomListItemRelations: Error fetching custom list item relations:', error);
    throw new Error(`Erro ao buscar relações do item da lista: ${error.message}`);
  }

  return data.map(relation => ({
    id: relation.id,
    custom_list_item_id: relation.custom_list_item_id,
    part_id: relation.part_id,
    quantity: relation.quantity,
    created_at: relation.created_at ? new Date(relation.created_at) : undefined,
    part_codigo: relation.parts?.codigo,
    part_name: relation.parts?.name,
    part_descricao: relation.parts?.descricao,
  })) as CustomListItemRelation[];
};

export const addCustomListItemRelation = async (relation: Omit<CustomListItemRelation, 'id' | 'created_at' | 'part_codigo' | 'part_name' | 'part_descricao'>): Promise<CustomListItemRelation> => {
  const newRelation = { ...relation, id: uuidv4() };
  const { data, error } = await supabase
    .from('custom_list_item_relations')
    .insert(newRelation)
    .select()
    .single();

  if (error) {
    console.error('Error adding custom list item relation:', error);
    throw new Error(`Erro ao adicionar relação ao item da lista: ${error.message}`);
  }

  // Retorna o objeto completo com os dados da peça para atualização da UI
  const { data: fetchedRelation, error: fetchError } = await supabase
    .from('custom_list_item_relations')
    .select(`
      id,
      custom_list_item_id,
      part_id,
      quantity,
      created_at,
      parts (
        codigo,
        name,
        descricao
      )
    `)
    .eq('id', data.id)
    .single();

  if (fetchError) {
    console.error('Error fetching newly added relation with part details:', fetchError);
    throw new Error(`Erro ao buscar detalhes da nova relação: ${fetchError.message}`);
  }

  return {
    id: fetchedRelation.id,
    custom_list_item_id: fetchedRelation.custom_list_item_id,
    part_id: fetchedRelation.part_id,
    quantity: fetchedRelation.quantity,
    created_at: fetchedRelation.created_at ? new Date(fetchedRelation.created_at) : undefined,
    part_codigo: fetchedRelation.parts?.codigo,
    part_name: fetchedRelation.parts?.name,
    part_descricao: fetchedRelation.parts?.descricao,
  } as CustomListItemRelation;
};

export const deleteCustomListItemRelation = async (relationId: string): Promise<void> => {
  const { error } = await supabase
    .from('custom_list_item_relations')
    .delete()
    .eq('id', relationId);

  if (error) {
    console.error('Error deleting custom list item relation:', error);
    throw new Error(`Erro ao excluir relação do item da lista: ${error.message}`);
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