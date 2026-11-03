import React from 'react';
import { GripVertical, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/responsive/ResponsivePopover';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import DragHandle from '@/components/sortable/DragHandle';
import { SortableTableRow } from '@/components/sortable/SortableList';
import type { SimplePartItem } from '@/services/partListService';
import type { RelatedPart } from '@/types/supabase';
import { cn } from '@/lib/utils';

interface PartsListMobileRowProps {
  item: SimplePartItem;
  /** Nome da peça (do item ou do catálogo). */
  name?: string;
  related: RelatedPart[];
  dragEnabled: boolean;
  flash: boolean;
  /** Abre a confirmação de remoção. */
  onRequestRemove: (id: string) => void;
  onEdit: (item: SimplePartItem) => void;
}

/** Linha da tabela da lista: alça | código · nome, descrição, AF, relacionados | Qtd | lixeira. */
const PartsListMobileRow: React.FC<PartsListMobileRowProps> = ({
  item,
  name,
  related,
  dragEnabled,
  flash,
  onRequestRemove,
  onEdit,
}) => {
  const label = item.codigo_peca || item.descricao || 'peça';

  const cells = (
    <>
      <TableCell className="w-9 p-0 align-top">
        {dragEnabled ? (
          <span data-no-ptr className="block">
            <DragHandle className="h-11 w-9" label={`Arrastar ${label}`} />
          </span>
        ) : (
          <span
            className="flex h-11 w-9 items-center justify-center text-muted-foreground/30"
            title="Desligue o agrupamento por AF para arrastar"
            aria-label="Desligue o agrupamento por AF para arrastar"
            role="img"
            data-testid="drag-handle-disabled"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}
      </TableCell>

      <TableCell className="py-1.5 pl-0 pr-2 align-top">
        <button
          type="button"
          className="block w-full min-h-11 text-left py-0.5 active:opacity-70"
          onClick={() => onEdit(item)}
          aria-label={`Editar ${label}`}
        >
          <span className="block text-sm font-bold text-blue-600 dark:text-blue-400 line-clamp-2" data-testid="parts-list-row-title">
            <span data-testid="parts-list-row-code">{item.codigo_peca || 'S/ Cód'}</span>
            {name && <span data-testid="parts-list-row-name"> · {name}</span>}
          </span>
          <span className="block text-xs text-muted-foreground uppercase line-clamp-2" data-testid="parts-list-row-desc">
            {item.descricao || 'S/ Desc'}
          </span>
        </button>
        {(item.af || related.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-2 text-xs">
            {item.af && (
              <span className="font-semibold text-blue-600 dark:text-blue-400" data-testid="parts-list-row-af">
                AF {item.af}
              </span>
            )}
            {related.length > 0 && (
              <ResponsivePopover>
                <ResponsivePopoverTrigger>
                  <button type="button" className="flex items-center gap-1 min-h-9 text-blue-600 dark:text-blue-400 font-medium">
                    <Tag className="h-3 w-3" /> {related.length} {related.length === 1 ? 'relacionado' : 'relacionados'}
                  </button>
                </ResponsivePopoverTrigger>
                <ResponsivePopoverContent title="Itens Relacionados" description={label} popoverClassName="w-auto max-w-xs p-2">
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {related.map((rel) => (
                      <li key={rel.codigo}>
                        <RelatedPartDisplay item={rel} />
                      </li>
                    ))}
                  </ul>
                </ResponsivePopoverContent>
              </ResponsivePopover>
            )}
          </div>
        )}
      </TableCell>

      <TableCell className="w-11 px-1 py-1.5 text-center align-top">
        <span className="flex h-11 items-center justify-center text-base font-bold tabular-nums" data-testid="parts-list-row-qty">
          {item.quantidade ?? 1}
        </span>
      </TableCell>

      <TableCell className="w-10 p-0 align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-10 text-destructive"
          aria-label={`Remover ${label}`}
          onClick={() => onRequestRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </>
  );

  const rowProps = {
    className: cn('border-b hover:bg-transparent', flash && 'bg-primary/10 animate-pulse'),
    'data-testid': 'parts-list-row',
    'data-item-id': item.id,
    'data-flash': flash || undefined,
  };

  return dragEnabled ? (
    <SortableTableRow id={item.id} {...rowProps}>
      {cells}
    </SortableTableRow>
  ) : (
    <TableRow {...rowProps}>{cells}</TableRow>
  );
};

export default React.memo(PartsListMobileRow);
