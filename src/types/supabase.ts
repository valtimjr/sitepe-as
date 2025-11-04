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

// Apontamento diário, agora parte de um array JSONB
export interface DailyApontamento {
  date: string; // Formato 'YYYY-MM-DD' - AGORA É O IDENTIFICADOR ÚNICO
  entry_time?: string; // Formato 'HH:MM'
  exit_time?: string; // Formato 'HH:MM'
  status?: string; // Novo campo para Folga, Falta, Suspensao, Outros
  created_at?: string; // Armazenado como string ISO para JSONB
  updated_at?: string; // Para controle de atualização dentro do JSONB
}

// Novo tipo para o registro mensal no Supabase
export interface MonthlyApontamento {
  id: string;
  user_id: string;
  month_year: string; // Formato 'YYYY-MM'
  data: DailyApontamento[]; // Array de apontamentos diários
  created_at?: string;
  updated_at?: string;
}

// NOVOS TIPOS PARA LISTAS PERSONALIZADAS E MENU
export interface CustomList {
  id: string;
  user_id: string;
  title: string;
  created_at?: Date;
  updated_at?: string; // Adicionado o campo updated_at
  items_data?: CustomListItem[]; // NOVO: Armazena os itens da lista como JSONB
}

export interface CustomListItem {
  id: string; // UUID gerado no frontend
  type: 'item' | 'subtitle' | 'separator'; // NOVO: Tipo do item
  item_name: string;
  part_code: string | null;
  description: string | null;
  quantity: number;
  order_index: number;
  itens_relacionados: string[]; // NOVO: Array de códigos de peças relacionadas
}

export interface MenuItem {
  id: string; // UUID gerado no frontend
  parent_id: string | null;
  title: string;
  order_index: number;
  list_id: string | null; // Se for um item final que aponta para uma lista
  itens_relacionados: string[]; // NOVO: Array de códigos de peças relacionadas
  children?: MenuItem[]; // Para a estrutura hierárquica
}