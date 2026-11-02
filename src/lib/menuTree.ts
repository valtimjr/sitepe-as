import type { MenuItem } from '@/types/supabase';

/** Filhos exibidos no Catálogo (sem os subtítulos dinâmicos das listas). */
export const visibleChildren = (item: MenuItem): MenuItem[] =>
  (item.children ?? []).filter(child => !child.isDynamic);

/** Quantidade de listas dentro do item (incluindo ele mesmo). */
export const countLists = (items: MenuItem[]): number =>
  items.reduce((total, item) => total + (item.list_id ? 1 : 0) + countLists(visibleChildren(item)), 0);

/** IDs de todos os itens que têm filhos visíveis (podem ser expandidos). */
export const collectExpandableIds = (items: MenuItem[]): string[] =>
  items.flatMap(item => {
    const children = visibleChildren(item);
    return children.length > 0 ? [item.id, ...collectExpandableIds(children)] : [];
  });

export const listPath = (company: string, item: MenuItem) => `/${company}/custom-list/${item.list_id}`;
