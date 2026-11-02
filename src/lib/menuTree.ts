import type { MenuItem } from '@/types/supabase';

/** Filhos exibidos no Catálogo (pastas, listas e subtítulos das listas). */
export const visibleChildren = (item: MenuItem): MenuItem[] => item.children ?? [];

/** Quantidade de listas dentro dos itens (subtítulos não contam como lista). */
export const countLists = (items: MenuItem[]): number =>
  items.reduce(
    (total, item) => total + (item.list_id && !item.isDynamic ? 1 : 0) + countLists(visibleChildren(item)),
    0,
  );

/** IDs de todos os itens que têm filhos visíveis (podem ser expandidos). */
export const collectExpandableIds = (items: MenuItem[]): string[] =>
  items.flatMap(item => {
    const children = visibleChildren(item);
    return children.length > 0 ? [item.id, ...collectExpandableIds(children)] : [];
  });

export const listPath = (company: string, item: MenuItem) =>
  `/${company}/custom-list/${item.list_id}${item.hash ? `#${item.hash}` : ''}`;

/** Monta a árvore a partir da lista plana, com os irmãos em ordem. */
export const buildMenuTree = (items: MenuItem[]): MenuItem[] => {
  const map = new Map<string, MenuItem>();
  items.forEach(item => map.set(item.id, { ...item, children: [], itens_relacionados: item.itens_relacionados || [] }));
  const roots: MenuItem[] = [];
  items.forEach(item => {
    const node = map.get(item.id)!;
    const parent = item.parent_id ? map.get(item.parent_id) : undefined;
    if (parent) parent.children!.push(node);
    else if (!item.parent_id) roots.push(node);
  });
  const sort = (nodes: MenuItem[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index);
    nodes.forEach(n => n.children && sort(n.children));
  };
  sort(roots);
  return roots;
};

export interface ParentOption {
  id: string;
  /** Caminho completo, ex.: "Motor › Filtros". */
  path: string;
}

/** Pastas que podem ser pai do item editado (sem ele mesmo e sem os descendentes dele). */
export const buildParentOptions = (flat: MenuItem[], excludeId?: string | null): ParentOption[] => {
  const options: ParentOption[] = [];
  const walk = (nodes: MenuItem[], trail: string[]) => {
    nodes.forEach(node => {
      if (node.isDynamic || node.list_id || node.id === excludeId) return;
      const path = [...trail, node.title];
      options.push({ id: node.id, path: path.join(' › ') });
      walk(node.children ?? [], path);
    });
  };
  walk(buildMenuTree(flat.filter(item => !item.isDynamic)), []);
  return options;
};
