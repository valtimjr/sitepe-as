import React, { useState } from 'react';
import { ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import QuantityStepper from './QuantityStepper';
import { partKey, type PickedPart } from './mergeParts';

interface SelectionItem extends Omit<PickedPart, 'quantidade'> {
  quantidade: number | '';
}

interface PartSelectionTrayProps {
  items: SelectionItem[];
  onSetQuantity: (key: string, value: number | '') => void;
  onRemove: (key: string) => void;
}

export const selectionSummary = (items: SelectionItem[]) => {
  const units = items.reduce((sum, p) => sum + (p.quantidade === '' ? 0 : p.quantidade), 0);
  return `${items.length} ${items.length === 1 ? 'peça' : 'peças'} · ${units} ${units === 1 ? 'unidade' : 'unidades'}`;
};

/** Bandeja recolhível com o resumo da seleção; aberta, permite ajustar ou remover cada peça. */
const PartSelectionTray: React.FC<PartSelectionTrayProps> = ({ items, onSetQuantity, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="border-b" data-testid="part-selection-tray">
      <button
        type="button"
        className="w-full min-h-11 px-4 flex items-center gap-2 text-sm font-medium text-primary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <ChevronUp className={cn('h-4 w-4 transition-transform', !expanded && 'rotate-180')} />
        <span data-testid="part-selection-summary">{selectionSummary(items)}</span>
      </button>
      {expanded && (
        <div className="max-h-[30dvh] overflow-y-auto overscroll-contain divide-y border-t">
          {items.map((p) => {
            const key = partKey(p);
            const label = p.codigo_peca || p.descricao;
            return (
              <div key={key} className="flex items-center gap-2 px-4 py-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-blue-600 truncate">{p.codigo_peca || 'S/ Cód'}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.descricao}</div>
                </div>
                <QuantityStepper
                  size="sm"
                  min={0}
                  value={p.quantidade}
                  onChange={(v) => onSetQuantity(key, v)}
                  label={`${label} na seleção`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 text-destructive"
                  aria-label={`Tirar ${label} da seleção`}
                  onClick={() => onRemove(key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PartSelectionTray;
