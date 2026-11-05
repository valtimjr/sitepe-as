import { normalizeBadge } from '@/lib/badge';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface AdminUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  badge: string | null;
  badge_normalized: string | null;
  email: string | null;
  profession_code: number | null;
  shift_code: number | null;
  suggest_parts: boolean | null;
  auto_fill_timesheet: boolean;
  is_duplicate: boolean;
}

export interface AttributeOption {
  ref_code: number;
  name: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuário',
  moderator: 'Moderador',
  admin: 'Admin',
};

export const fullName = (u: Pick<AdminUser, 'first_name' | 'last_name'>) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Sem nome';

export const initials = (u: Pick<AdminUser, 'first_name' | 'last_name'>) =>
  ([u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join('') || '?').toUpperCase();

/** Nome do atributo pelo código; códigos que não existem na empresa ficam visíveis. */
export const attributeLabel = (code: number | null, map: Map<number, string>) =>
  code == null ? null : map.get(code) ?? `Código ${code} (não encontrado)`;

/** Recalcula `badge_normalized` e `is_duplicate` com a mesma regra do banco. */
export const markDuplicates = (users: AdminUser[]): AdminUser[] => {
  const counts = new Map<string, number>();
  const normalized = users.map((u) => normalizeBadge(u.badge) || null);
  normalized.forEach((n) => n && counts.set(n, (counts.get(n) ?? 0) + 1));
  return users.map((u, i) => {
    const n = normalized[i];
    return { ...u, badge_normalized: n, is_duplicate: !!n && (counts.get(n) ?? 0) > 1 };
  });
};
