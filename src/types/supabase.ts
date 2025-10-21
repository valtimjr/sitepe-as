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