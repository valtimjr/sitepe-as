import React from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MenuItemIcon from '@/components/list-icon/MenuItemIcon';
import ActionMenu from '@/components/admin/ActionMenu';
import DragHandle from '@/components/sortable/DragHandle';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/types/supabase';

export interface MenuTreeHandlers {
  onEdit: (item: MenuItem) => void;
  onAddChild: (parentId: string) => void;
  onMove: (item: MenuItem, direction: 'up' | 'down') => void;
  onDelete: (item: MenuItem) => void;
  onEditList: (listId: string) => void;
}

interface MenuTreeRowProps extends MenuTreeHandlers {
  item: MenuItem;
  meta: string;
  isCompact: boolean;
  expandable: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

/** Linha da árvore do menu: [alça] [ícone] [título + tipo] [chevron] [⋯]. */
const MenuTreeRow: React.FC<MenuTreeRowProps> = ({
  item,
  meta,
  isCompact,
  expandable,
  expanded,
  onToggle,
  isFirst,
  isLast,
  onEdit,
  onAddChild,
  onMove,
  onDelete,
  onEditList,
}) => {
  const isDynamic = !!item.isDynamic;
  const isList = !!item.list_id && !isDynamic;
  const isFolder = !item.list_id;

  const toggle = () => {
    tap();
    onToggle(item.id);
  };

  // Tocar na linha: pasta expande/recolhe; lista abre a edição; subtítulo leva à lista.
  const handleMain = () => {
    if (isDynamic) onEditList(item.list_id!);
    else if (isFolder && expandable) toggle();
    else onEdit(item);
  };

  const actions = isDynamic
    ? [{ label: 'Editar na lista', icon: ExternalLink, onSelect: () => onEditList(item.list_id!) }]
    : [
        { label: 'Editar', icon: Pencil, onSelect: () => onEdit(item) },
        isFolder && { label: 'Adicionar submenu', icon: Plus, onSelect: () => onAddChild(item.id) },
        { label: 'Mover para cima', icon: ArrowUp, onSelect: () => onMove(item, 'up'), disabled: isFirst },
        { label: 'Mover para baixo', icon: ArrowDown, onSelect: () => onMove(item, 'down'), disabled: isLast },
        isList && { label: 'Editar na lista', icon: ExternalLink, onSelect: () => onEditList(item.list_id!) },
        {
          label: 'Excluir',
          icon: Trash2,
          destructive: true,
          onSelect: () => onDelete(item),
          confirm: {
            title: 'Excluir item?',
            description: `"${item.title}" e todos os submenus dele serão removidos do menu. Esta ação não pode ser desfeita.`,
          },
        },
      ];

  return (
    <div
      className={cn(
        'group flex min-h-12 items-center gap-1 rounded-md pr-0.5 transition-colors',
        isDynamic ? 'text-muted-foreground' : 'hover:bg-muted/50 focus-within:bg-muted/50',
      )}
      data-testid={isDynamic ? 'menu-tree-subtitle' : 'menu-tree-row'}
      data-item-id={item.id}
    >
      {!isDynamic && <DragHandle />}

      <button
        type="button"
        onClick={handleMain}
        aria-expanded={isFolder && expandable ? expanded : undefined}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isDynamic && 'pl-1',
        )}
        data-testid="menu-tree-main"
      >
        <MenuItemIcon item={item} size="sm" className={cn('rounded-md', isDynamic ? 'h-7 w-7' : 'h-9 w-9')} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('line-clamp-2 break-words', isDynamic ? 'text-sm' : 'text-sm font-medium', isList && 'text-primary')}>
            {item.title}
          </span>
          <span className="text-xs text-muted-foreground">{meta}</span>
        </span>
      </button>

      {expandable && (
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label={expanded ? `Recolher ${item.title}` : `Expandir ${item.title}`}
          aria-expanded={expanded}
          data-testid="menu-tree-toggle"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', !expanded && '-rotate-90')} />
        </button>
      )}

      {!isCompact && !isDynamic && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onEdit(item)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          {isFolder && (
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-green-700 dark:text-green-500" onClick={() => onAddChild(item.id)}>
              <Plus className="h-3.5 w-3.5" /> Submenu
            </Button>
          )}
        </div>
      )}

      {isDynamic && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">da lista</span>
      )}

      <ActionMenu title={item.title} actions={actions} />
    </div>
  );
};

export default MenuTreeRow;
