export interface PageAccessRule {
  page_path: string;
  admin_access: boolean;
  moderator_access: boolean;
  user_access: boolean;
  guest_access: boolean; // Adicionado para o nível de acesso de convidados
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  role: 'admin' | 'moderator' | 'user';
  badge: string | null;
}

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags?: string;
  name?: string; // NOVO CAMPO: Nome global da peça
}

export interface Apontamento {
  id: string;
  user_id: string;
  date: string; // Formato 'YYYY-MM-DD'
  entry_time?: string; // Formato 'HH:MM'
  exit_time?: string; // Formato 'HH:MM'
  status?: string; // Novo campo para Folga, Falta, Suspensao, Outros
  created_at?: Date;
  synced_at?: Date;
}

// NOVOS TIPOS PARA LISTAS PERSONALIZADAS E MENU
export interface CustomList {
  id: string;
  user_id: string;
  title: string;
  created_at?: Date;
}

export interface CustomListItem {
  id: string;
  list_id: string;
  item_name: string;
  part_code: string | null;
  description: string | null;
  quantity: number;
  order_index: number; // Adicionado order_index
  created_at?: Date;
  list_title?: string; // Adicionado para hover card de itens relacionados
}

export interface CustomListItemRelation {
  id: string;
  custom_list_item_id: string;
  part_id: string;
  quantity: number;
  created_at?: Date;
  // Campos adicionais para exibição (não do DB diretamente, mas join)
  part_codigo?: string;
  part_name?: string;
  part_descricao?: string;
}

export interface MenuItem {
  id: string;
  parent_id: string | null;
  title: string;
  order_index: number;
  list_id: string | null; // Se for um item final que aponta para uma lista
  created_at?: Date;
  children?: MenuItem[]; // Para a estrutura hierárquica
}