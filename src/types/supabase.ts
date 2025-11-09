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

export interface RelatedPart {
  codigo: string;
  name: string;
  desc: string;
}

export type RelatedItem = string | RelatedPart; // Para migração de dados legados

export interface Af {
  id: string;
  af_number: string;
  descricao: string; // Tornada obrigatória
}

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags: string; // Tornada obrigatória
  name: string; // Tornada obrigatória
  itens_relacionados: RelatedPart[]; // Tornada obrigatória
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

// New structure for the Mangueira item components
export interface MangueiraPartDetails {
  codigo: string;
  name: string;
  description: string;
}

export interface MangueiraItemData {
  mangueira: MangueiraPartDetails;
  conexao1: MangueiraPartDetails;
  conexao2: MangueiraPartDetails;
  corte_cm: number; // New field for cut length
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
  type: 'item' | 'subtitle' | 'separator' | 'mangueira'; // ATUALIZADO: Adicionado 'mangueira'
  item_name: string;
  order_index: number;
  
  // Fields specific to type 'item' (legacy/simple part)
  part_code: string | null;
  description: string | null;
  quantity: number;
  itens_relacionados: RelatedPart[]; 

  // Fields specific to type 'mangueira'
  mangueira_data?: MangueiraItemData; // NOVO: Dados complexos para Mangueira
}

export interface MenuItem {
  id: string; // UUID gerado no frontend
  parent_id: string | null;
  title: string;
  order_index: number;
  list_id: string | null; // Se for um item final que aponta para uma lista
  itens_relacionados: RelatedPart[]; // ATUALIZADO para usar a nova interface
  hash?: string; // NOVO: Para links de âncora
  children?: MenuItem[]; // Para a estrutura hierárquica
}