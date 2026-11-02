import React from 'react';
import type { MenuItem } from '@/types/supabase';
import { countLists, visibleChildren } from '@/lib/menuTree';
import { cn } from '@/lib/utils';
import { CatalogChildren, CatalogRow } from './CatalogTreeNode';

interface CatalogCategoryCardProps {
  item: MenuItem;
  company: string;
  compact: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

/** Cartão de uma categoria de topo do Catálogo. */
const CatalogCategoryCard: React.FC<CatalogCategoryCardProps> = ({ item, company, compact, expandedIds, onToggle }) => {
  const children = visibleChildren(item);
  const expanded = expandedIds.has(item.id);
  const lists = countLists(children);

  const badge =
    children.length > 0 ? (
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
        {lists} {lists === 1 ? 'lista' : 'listas'}
      </span>
    ) : null;

  return (
    <section
      className={cn('rounded-none border bg-card text-card-foreground shadow-sm', compact ? 'p-1.5' : 'p-2 self-start')}
      data-testid="catalog-category"
      aria-label={item.title}
    >
      <CatalogRow
        item={item}
        company={company}
        compact={compact}
        expanded={expanded}
        onToggle={onToggle}
        isHeader
        badge={badge}
      />
      {children.length > 0 && expanded && (
        <div className="mt-1 pb-1">
          <CatalogChildren items={children} company={company} compact={compact} expandedIds={expandedIds} onToggle={onToggle} />
        </div>
      )}
    </section>
  );
};

export default CatalogCategoryCard;
