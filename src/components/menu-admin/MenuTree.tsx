import React from 'react';
import SortableList from '@/components/sortable/SortableList';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/types/supabase';
import MenuTreeRow, { type MenuTreeHandlers } from './MenuTreeRow';

interface MenuTreeProps extends MenuTreeHandlers {
  nodes: MenuItem[];
  level?: number;
  isCompact: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  getMeta: (item: MenuItem) => string;
  /** Nova ordem (ids) de um grupo de irmãos. */
  onReorder: (ids: string[]) => void;
}

/** Árvore do menu: cada grupo de irmãos é reordenável; subtítulos das listas ficam fora (só leitura). */
const MenuTree: React.FC<MenuTreeProps> = ({ nodes, level = 0, ...props }) => {
  const { isCompact, expandedIds, onToggle, getMeta, onReorder, ...handlers } = props;
  const sortable = nodes.filter(n => !n.isDynamic);
  const dynamic = nodes.filter(n => n.isDynamic);

  const row = (item: MenuItem, index: number, siblings: MenuItem[]) => {
    const children = item.children ?? [];
    return (
      <MenuTreeRow
        item={item}
        meta={getMeta(item)}
        isCompact={isCompact}
        expandable={children.length > 0}
        expanded={expandedIds.has(item.id)}
        onToggle={onToggle}
        isFirst={index === 0}
        isLast={index === siblings.length - 1}
        {...handlers}
      />
    );
  };

  const children = (item: MenuItem) =>
    (item.children?.length ?? 0) > 0 && expandedIds.has(item.id) ? (
      <MenuTree nodes={item.children!} level={level + 1} {...props} />
    ) : null;

  return (
    <div className={cn(level > 0 && 'ml-4 border-l border-border pl-2')} data-testid={`menu-tree-level-${level}`}>
      <SortableList
        items={sortable}
        getId={item => item.id}
        onReorder={onReorder}
        renderItem={(item, index) => (
          <>
            {row(item, index, sortable)}
            {children(item)}
          </>
        )}
        renderOverlay={item => row(item, sortable.indexOf(item), sortable)}
      />
      {dynamic.map((item, index) => (
        <div key={item.id}>{row(item, index, dynamic)}</div>
      ))}
    </div>
  );
};

export default MenuTree;
