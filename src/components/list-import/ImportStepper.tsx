import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const IMPORT_STEPS = ['Arquivo', 'Mapeamento', 'Validação', 'Importação'] as const;

interface ImportStepperProps {
  current: number;
  maxReached: number;
  disabledSteps?: number[];
  onStepClick: (step: number) => void;
}

const ImportStepper: React.FC<ImportStepperProps> = ({ current, maxReached, disabledSteps = [], onStepClick }) => (
  <div className="overflow-x-auto border-b bg-muted/40">
    <div className="flex min-w-max sm:min-w-0 p-1.5 gap-1">
      {IMPORT_STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current && !disabledSteps.includes(step);
        const clickable = step <= maxReached && step !== current && !disabledSteps.includes(step);
        return (
          <button
            key={label}
            type="button"
            disabled={!clickable}
            onClick={() => onStepClick(step)}
            data-testid={`import-step-${step}`}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              isActive && 'bg-primary text-primary-foreground shadow-sm',
              !isActive && clickable && 'text-foreground hover:bg-primary/10 cursor-pointer',
              !isActive && !clickable && 'text-muted-foreground',
              disabledSteps.includes(step) && 'opacity-40 line-through'
            )}
          >
            {isDone ? <Check className="h-4 w-4" /> : <span>{step}.</span>}
            {label}
          </button>
        );
      })}
    </div>
  </div>
);

export default ImportStepper;
