import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import type { RelatedPart } from '@/types/supabase';
import { cn } from '@/lib/utils';

interface RelatedItemsPopoverProps {
  title: string;
  items: RelatedPart[];
  compact?: boolean;
}

/** Botão ⓘ que mostra os itens relacionados sem disparar a navegação da linha. */
const RelatedItemsPopover: React.FC<RelatedItemsPopoverProps> = ({ title, items, compact }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('shrink-0 text-muted-foreground', compact ? 'h-10 w-10' : 'h-8 w-8')}
        aria-label={`Itens relacionados de ${title}`}
        data-testid="catalog-related-button"
        onClick={e => e.stopPropagation()}
      >
        <Info className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-72 p-3" align="end" data-testid="catalog-related-popover">
      <p className="font-bold text-sm mb-2">Itens Relacionados</p>
      <ul className="max-h-64 overflow-y-auto overscroll-contain space-y-1.5 text-sm">
        {items.map(rel => (
          <li key={rel.codigo}>
            <RelatedPartDisplay item={rel} />
          </li>
        ))}
      </ul>
    </PopoverContent>
  </Popover>
);

export default RelatedItemsPopover;
