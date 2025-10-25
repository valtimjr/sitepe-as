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
  created_at?: Date;
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