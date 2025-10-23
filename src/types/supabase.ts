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