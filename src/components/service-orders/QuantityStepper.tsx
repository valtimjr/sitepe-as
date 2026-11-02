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
}

/** Botões − e + com o campo numérico no meio. */
const QuantityStepper: React.FC<QuantityStepperProps> = ({ value, onChange, error, className }) => {
  const current = value === '' ? 0 : value;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0"
        aria-label="Diminuir quantidade"
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current <= 1}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label="Quantidade"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '') return onChange('');
          const parsed = parseInt(val, 10);
          onChange(isNaN(parsed) ? '' : parsed);
        }}
        className={cn('h-11 w-20 text-center text-base', error && 'border-destructive focus-visible:ring-destructive')}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0"
        aria-label="Aumentar quantidade"
        onClick={() => onChange(current + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default QuantityStepper;
