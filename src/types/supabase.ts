export interface PageAccessRule {
  page_path: string;
  admin_access: boolean;
  moderator_access: boolean;
  user_access: boolean;
  guest_access: boolean;
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

export type RelatedItem = string | RelatedPart;

export interface Af {
  id: string;
  af_number: string;
  descricao: string;
}

export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  tags: string;
  name: string;
  itens_relacionados: RelatedPart[];
}

export interface DailyApontamento {
  date: string;
  entry_time?: string;
  exit_time?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyApontamento {
  id: string;
  user_id: string;
  month_year: string;
  data: DailyApontamento[];
  created_at?: string;
  updated_at?: string;
}

// Estrutura para os itens de peça dentro da OS
export interface ServiceOrderPart {
  codigo_peca: string;
  descricao: string;
  quantidade: number;
}

// Estrutura de uma única Ordem de Serviço dentro do array JSONB
export interface ServiceOrderData {
  id: string;
  af: string;
  os: string;
  hora_inicio: string;
  hora_final: string;
  servico_executado: string;
  parts: ServiceOrderPart[];
}

// Estrutura da linha na tabela daily_service_orders
export interface DailyServiceOrder {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  user_badge: string | null;
  user_name: string | null;
  os_list: ServiceOrderData[];
  created_at?: string;
  updated_at?: string;
}

export interface MangueiraPartDetails {
  codigo: string;
  name: string;
  description: string;
}

export interface MangueiraItemData {
  mangueira: MangueiraPartDetails;
  conexao1: MangueiraPartDetails;
  conexao2: MangueiraPartDetails;
  corte_cm: number;
}

export interface CustomList {
  id: string;
  user_id: string;
  title: string;
  created_at?: Date;
  updated_at?: string;
  items_data?: CustomListItem[];
}

export interface CustomListItem {
  id: string;
  type: 'item' | 'subtitle' | 'separator' | 'mangueira';
  item_name: string;
  order_index: number;
  part_code: string | null;
  description: string | null;
  quantity: number;
  itens_relacionados: RelatedPart[]; 
  mangueira_data?: MangueiraItemData;
}

export interface MenuItem {
  id: string;
  parent_id: string | null;
  title: string;
  order_index: number;
  list_id: string | null;
  itens_relacionados: RelatedPart[];
  hash?: string;
  children?: MenuItem[];
  isDynamic?: boolean;
}