import React from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tap } from '@/lib/haptics';

interface CustomListSelectionBarProps {
  count: number;
  disabled?: boolean;
  onClear: () => void;
  onExport: () => void;
}

/** Barra flutuante (celular) com a seleção atual, acima da barra inferior. */
const CustomListSelectionBar: React.FC<CustomListSelectionBarProps> = ({ count, disabled, onClear, onExport }) => (
  <div
    className="fixed inset-x-3 z-40 flex items-center gap-2 rounded-xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 p-2 pl-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200"
    style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4rem + 8px)' }}
    data-testid="custom-list-selection-bar"
    role="region"
    aria-label="Itens selecionados"
  >
    <span className="flex-1 text-sm font-semibold text-primary tabular-nums">
      {count} {count === 1 ? 'selecionado' : 'selecionados'}
    </span>
    <Button variant="ghost" className="h-10 px-3" onClick={onClear}>
      <X className="h-4 w-4 mr-1" /> Limpar
    </Button>
    <Button
      className="h-10 px-4"
      disabled={disabled}
      onClick={() => {
        tap();
        onExport();
      }}
    >
      <PlusCircle className="h-4 w-4 mr-1.5" /> Exportar
    </Button>
  </div>
);

export default CustomListSelectionBar;
