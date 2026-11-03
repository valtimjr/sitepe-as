import React from 'react';
import { Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import QuantityStepper from './QuantityStepper';
import type { DisplayPart } from './usePartSearch';

interface PartResultRowProps {
  part: DisplayPart;
  /** Quantidade já escolhida na seleção (0 = não escolhida). */
  quantity: number | '';
  isFavorite: boolean;
  isFrequent: boolean;
  onAdd: (part: DisplayPart) => void;
  onSetQuantity: (part: DisplayPart, value: number | '') => void;
  onToggleFavorite: (part: DisplayPart) => void;
}

/** Linha de resultado: toque adiciona 1; depois do 1º toque o + vira um stepper. */
const PartResultRow: React.FC<PartResultRowProps> = ({
  part,
  quantity,
  isFavorite,
  isFrequent,
  onAdd,
  onSetQuantity,
  onToggleFavorite,
}) => {
  const selected = quantity === '' || quantity > 0;
  const label = part.codigo || part.descricao;
  return (
    <div
      data-testid="part-picker-result"
      className={cn(
        'flex items-center gap-1 border-b last:border-0 pl-3 pr-2 min-h-14 [content-visibility:auto] [contain-intrinsic-size:auto_56px]',
        selected && 'bg-primary/5',
      )}
    >
      <button
        type="button"
        className="flex-1 min-w-0 text-left py-2 active:opacity-70"
        onClick={() => onAdd(part)}
        aria-label={`Adicionar ${label}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-blue-600 text-sm truncate">{part.codigo || 'S/ Cód'}</span>
          {isFrequent && (
            <span className="text-blue-500 font-bold text-xs" title="Peça recomendada para sua profissão">★</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2">{part.name || part.descricao}</div>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(part)}
        className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center hover:bg-muted"
        aria-label={isFavorite ? `Remover ${label} dos favoritos` : `Adicionar ${label} aos favoritos`}
        aria-pressed={isFavorite}
      >
        <Star
          className={cn(
            'h-4 w-4 transition-all',
            isFavorite ? 'fill-amber-500 text-amber-500 scale-110' : 'text-gray-300 dark:text-gray-600',
          )}
        />
      </button>
      {selected ? (
        <QuantityStepper
          size="sm"
          min={0}
          value={quantity}
          onChange={(v) => onSetQuantity(part, v)}
          label={label}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 text-primary"
          onClick={() => onAdd(part)}
          aria-label={`Adicionar 1 ${label}`}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default React.memo(PartResultRow);
