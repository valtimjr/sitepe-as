import React, { useEffect, useState } from 'react';
import { GripVertical, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/responsive/ResponsivePopover';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import DragHandle from '@/components/sortable/DragHandle';
import QuantityStepper from '@/components/service-orders/QuantityStepper';
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
  onQuantity: (id: string, quantidade: number) => void;
  /** Abre a confirmação de remoção. */
  onRequestRemove: (id: string) => void;
  onEdit: (item: SimplePartItem) => void;
}

/** Cartão de uma peça da lista: alça, código · nome, descrição, AF, relacionados, − / + e lixeira. */
const PartsListMobileRow: React.FC<PartsListMobileRowProps> = ({
  item,
  name,
  related,
  dragEnabled,
  flash,
  onQuantity,
  onRequestRemove,
  onEdit,
}) => {
  const label = item.codigo_peca || item.descricao || 'peça';
  const [qty, setQty] = useState<number | ''>(item.quantidade ?? 1);

  useEffect(() => setQty(item.quantidade ?? 1), [item.quantidade]);

  return (
    <div
      className={cn(
        'flex items-start gap-1 rounded-lg border bg-card pl-0.5 pr-1.5 py-1.5 transition-shadow [content-visibility:auto] [contain-intrinsic-size:auto_84px]',
        flash && 'ring-2 ring-primary/60 animate-pulse',
      )}
      data-testid="parts-list-row"
      data-item-id={item.id}
      data-flash={flash || undefined}
    >
      {dragEnabled ? (
        <span data-no-ptr className="shrink-0">
          <DragHandle className="h-11 w-9" label={`Arrastar ${label}`} />
        </span>
      ) : (
        <span
          className="flex h-11 w-9 shrink-0 items-center justify-center text-muted-foreground/30"
          title="Desligue o agrupamento por AF para arrastar"
          aria-label="Desligue o agrupamento por AF para arrastar"
          role="img"
          data-testid="drag-handle-disabled"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      )}

      <div className="flex-1 min-w-0">
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
          <span className="block text-xs text-muted-foreground uppercase line-clamp-2" data-testid="parts-list-row-desc">{item.descricao || 'S/ Desc'}</span>
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
                  <button
                    type="button"
                    className="flex items-center gap-1 min-h-9 text-blue-600 dark:text-blue-400 font-medium"
                  >
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
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <QuantityStepper
          size="sm"
          min={1}
          value={qty}
          label={label}
          onChange={(v) => {
            setQty(v);
            if (v !== '' && v > 0) onQuantity(item.id, v);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-destructive"
          aria-label={`Remover ${label}`}
          onClick={() => onRequestRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default React.memo(PartsListMobileRow);
