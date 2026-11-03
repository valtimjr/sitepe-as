import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number | '';
  onChange: (value: number | '') => void;
  error?: boolean;
  className?: string;
  /** "sm" (36px) para linhas de lista; "default" (44px) para formulários. */
  size?: 'default' | 'sm';
  /** Menor valor do botão −. Use 0 para permitir tirar a peça da seleção. */
  min?: number;
  /** Complemento dos rótulos acessíveis (ex.: código da peça). */
  label?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

/** Botões − e + com o campo numérico no meio. */
const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  error,
  className,
  size = 'default',
  min = 1,
  label,
  inputRef,
}) => {
  const current = value === '' ? 0 : value;
  const sm = size === 'sm';
  const suffix = label ? ` de ${label}` : '';
  return (
    <div className={cn('flex items-center', sm ? 'gap-1' : 'gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('shrink-0', sm ? 'h-9 w-9' : 'h-11 w-11')}
        aria-label={`Diminuir quantidade${suffix}`}
        onClick={() => onChange(Math.max(min, current - 1))}
        disabled={current <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        aria-label={`Quantidade${suffix}`}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '') return onChange('');
          const parsed = parseInt(val, 10);
          onChange(isNaN(parsed) ? '' : parsed);
        }}
        className={cn(
          'text-center text-base px-1',
          sm ? 'h-9 w-12' : 'h-11 w-20',
          error && 'border-destructive focus-visible:ring-destructive',
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('shrink-0', sm ? 'h-9 w-9' : 'h-11 w-11')}
        aria-label={`Aumentar quantidade${suffix}`}
        onClick={() => onChange(current + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default QuantityStepper;
