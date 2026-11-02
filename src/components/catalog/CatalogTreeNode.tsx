import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import MenuItemIcon from '@/components/list-icon/MenuItemIcon';
import RelatedItemsPopover from './RelatedItemsPopover';
import type { MenuItem } from '@/types/supabase';
import { listPath, visibleChildren } from '@/lib/menuTree';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface CatalogRowProps {
  item: MenuItem;
  company: string;
  compact: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  /** Linha de topo do cartão de categoria (título maior + badge). */
  isHeader?: boolean;
  badge?: React.ReactNode;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

/** Linha do catálogo: lista (link), pasta (expande) ou ambos. */
export const CatalogRow: React.FC<CatalogRowProps> = ({ item, company, compact, expanded, onToggle, isHeader, badge }) => {
  const hasChildren = visibleChildren(item).length > 0;
  const isList = !!item.list_id;
  const hasRelated = (item.itens_relacionados?.length ?? 0) > 0;

  const toggle = () => {
    tap();
    onToggle(item.id);
  };

  const chevron = (
    <ChevronDown
      className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !expanded && '-rotate-90')}
      aria-hidden="true"
    />
  );

  const label = (
    <>
      <MenuItemIcon item={item} size="sm" className="h-9 w-9 rounded-md" />
      <span
        className={cn(
          'flex-1 min-w-0 line-clamp-2 text-left',
          isHeader ? 'font-semibold text-base' : 'text-sm font-medium',
          isList && 'text-primary',
        )}
      >
        {item.title}
      </span>
      {badge}
    </>
  );

  const mainClass = cn(
    'group flex flex-1 min-w-0 min-h-11 items-center gap-3 rounded-md px-2 py-1 transition-colors',
    compact ? 'active:bg-muted' : 'hover:bg-muted/60',
    focusRing,
  );

  return (
    <div className="flex items-center gap-0.5" data-testid={isHeader ? 'catalog-category-header' : 'catalog-node'}>
      {isList ? (
        <Link to={listPath(company, item)} className={mainClass} onClick={() => tap()} data-testid="catalog-list-link">
          {label}
          {!hasChildren &&
            (compact ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ArrowRight
                className="h-4 w-4 shrink-0 text-primary opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100"
                aria-hidden="true"
              />
            ))}
        </Link>
      ) : hasChildren ? (
        <button
          type="button"
          className={mainClass}
          onClick={toggle}
          aria-expanded={expanded}
          data-testid={isHeader ? 'catalog-category-toggle' : 'catalog-folder-toggle'}
        >
          {label}
          {chevron}
        </button>
      ) : (
        <div className={cn(mainClass, 'text-muted-foreground')}>{label}</div>
      )}

      {hasRelated && <RelatedItemsPopover title={item.title} items={item.itens_relacionados} compact={compact} />}

      {isList && hasChildren && (
        <button
          type="button"
          className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-muted/60 active:bg-muted', focusRing)}
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Recolher ${item.title}` : `Expandir ${item.title}`}
        >
          {chevron}
        </button>
      )}
    </div>
  );
};

interface CatalogTreeNodeProps {
  item: MenuItem;
  company: string;
  compact: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

/** Nó da árvore com os filhos recuados por uma guia vertical. */
const CatalogTreeNode: React.FC<CatalogTreeNodeProps> = ({ item, company, compact, expandedIds, onToggle }) => {
  const children = visibleChildren(item);
  const expanded = expandedIds.has(item.id);

  return (
    <div>
      <CatalogRow item={item} company={company} compact={compact} expanded={expanded} onToggle={onToggle} />
      {children.length > 0 && expanded && <CatalogChildren items={children} company={company} compact={compact} expandedIds={expandedIds} onToggle={onToggle} />}
    </div>
  );
};

/** Filhos de um nó, com guia vertical à esquerda. */
export const CatalogChildren: React.FC<Omit<CatalogTreeNodeProps, 'item'> & { items: MenuItem[] }> = ({ items, ...rest }) => (
  <div className="ml-[26px] border-l border-border pl-1.5 space-y-0.5">
    {items.map(child => (
      <CatalogTreeNode key={child.id} item={child} {...rest} />
    ))}
  </div>
);

export default CatalogTreeNode;
