import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Boxes, ClipboardList, IdCard, Mail, Menu, Tags, type LucideIcon } from 'lucide-react';

export type AdminSectionKey = 'pecas' | 'afs' | 'convites' | 'crachas' | 'atributos' | 'menus';

export interface AdminSection {
  key: AdminSectionKey;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** Seção visível para moderadores (os demais são só de admin). */
  moderator?: boolean;
  /** Baixa o código da seção (usado também para pré-carregar). */
  load: () => Promise<{ default: ComponentType }>;
  Component: LazyExoticComponent<ComponentType>;
}

const section = (s: Omit<AdminSection, 'Component'>): AdminSection => ({ ...s, Component: lazy(s.load) });

export const ADMIN_SECTIONS: AdminSection[] = [
  section({
    key: 'pecas',
    label: 'Peças',
    subtitle: 'Cadastro e importação de peças',
    icon: Boxes,
    load: () => import('@/components/PartManagementTable'),
  }),
  section({
    key: 'afs',
    label: 'AFs',
    subtitle: 'Números de AF e descrições',
    icon: ClipboardList,
    load: () => import('@/components/AfManagementTable'),
  }),
  section({
    key: 'convites',
    label: 'Convites',
    subtitle: 'Links de cadastro de usuários',
    icon: Mail,
    moderator: true,
    load: () => import('@/components/InviteManager'),
  }),
  section({
    key: 'crachas',
    label: 'Crachás',
    subtitle: 'Números de crachá usados no login',
    icon: IdCard,
    moderator: true,
    load: () => import('@/components/admin/BadgeManager'),
  }),
  section({
    key: 'atributos',
    label: 'Atributos de Usuário',
    subtitle: 'Campos extras dos perfis',
    icon: Tags,
    load: () => import('@/components/UserAttributesManager'),
  }),
  section({
    key: 'menus',
    label: 'Menus & Listas',
    subtitle: 'Estrutura do menu e listas personalizadas',
    icon: Menu,
    load: () =>
      import('@/pages/MenuManagerPage').then(m => ({
        default: () => createElement(m.default, { isEmbedded: true }),
      })),
  }),
];

/** Admin vê tudo; moderador só Convites e Crachás. */
export const getVisibleSections = (role: string | undefined, canAccessMenuManager: boolean) => {
  if (role === 'admin') return ADMIN_SECTIONS.filter(s => s.key !== 'menus' || canAccessMenuManager);
  if (role === 'moderator') return ADMIN_SECTIONS.filter(s => s.moderator);
  return [];
};

export const preloadSection = (s: AdminSection) => {
  void s.load();
};
