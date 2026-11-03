import React from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import type { SimplePartItem } from '@/services/partListService';
import { tap } from '@/lib/haptics';
import { optionRowClass } from './ListOptionsSheet';

export type SortField = 'codigo' | 'descricao' | 'af' | 'quantidade';
export type SortDirection = 'asc' | 'desc';

/** Ordena uma cópia dos itens pelo campo escolhido. */
export const sortItems = (items: SimplePartItem[], field: SortField, direction: SortDirection) => {
  const value = (i: SimplePartItem) =>
    field === 'codigo' ? i.codigo_peca || '' : field === 'descricao' ? i.descricao || '' : field === 'af' ? i.af || '' : i.quantidade ?? 0;
  const sign = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sign;
    return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * sign;
  });
};

const FIELDS: { field: SortField; label: string }[] = [
  { field: 'codigo', label: 'Código' },
  { field: 'descricao', label: 'Descrição' },
  { field: 'af', label: 'AF' },
  { field: 'quantidade', label: 'Quantidade' },
];

interface PartsListSortSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSort: (field: SortField, direction: SortDirection) => void;
}

/** Gaveta Ordenar: ordem manual ou por campo (↑/↓). Ordenar grava a nova ordem. */
const PartsListSortSheet: React.FC<PartsListSortSheetProps> = ({ open, onOpenChange, onSort }) => {
  const pick = (field: SortField, direction: SortDirection) => {
    tap();
    onOpenChange(false);
    onSort(field, direction);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="sm:max-w-md" data-testid="parts-list-sort-sheet">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Ordenar</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>A nova ordem é gravada na lista.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-1">
          <button type="button" className={optionRowClass} onClick={() => onOpenChange(false)}>
            <GripVertical className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-base font-medium">Ordem manual (arrastar)</span>
              <span className="block text-xs text-muted-foreground">Segure a alça ⠿ e arraste</span>
            </span>
          </button>
          {FIELDS.map(({ field, label }) => (
            <div key={field} className="flex items-center gap-2 min-h-14 px-3 rounded-lg">
              <span className="flex-1 text-base font-medium">{label}</span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-md border active:bg-muted"
                onClick={() => pick(field, 'asc')}
                aria-label={`${label} crescente`}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-md border active:bg-muted"
                onClick={() => pick(field, 'desc')}
                aria-label={`${label} decrescente`}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default PartsListSortSheet;
