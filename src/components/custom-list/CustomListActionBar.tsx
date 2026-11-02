import React from 'react';
import { Copy, Download, FileDown, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CustomListActionBarProps {
  selectedCount: number;
  disabled: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onCopy: () => void;
  onCsv: () => void;
  onPdf: () => void;
  onClearSelection: () => void;
}

/** Barra de ações da lista (web): fixa no topo do card durante a rolagem. */
const CustomListActionBar: React.FC<CustomListActionBarProps> = ({
  selectedCount,
  disabled,
  exportDisabled,
  onExport,
  onCopy,
  onCsv,
  onPdf,
  onClearSelection,
}) => {
  const secondary = [
    { label: 'Copiar', aria: 'Copiar lista', tip: 'Copiar a lista como texto', Icon: Copy, onClick: onCopy },
    { label: 'CSV', aria: 'Exportar CSV', tip: 'Exportar planilha CSV', Icon: Download, onClick: onCsv },
    { label: 'PDF', aria: 'Exportar PDF', tip: 'Gerar PDF', Icon: FileDown, onClick: onPdf },
  ];

  return (
    <div
      className="sticky top-16 z-20 px-6 py-3 border-y bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      data-testid="custom-list-action-bar"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onExport} disabled={exportDisabled} data-testid="custom-list-export-button">
          <PlusCircle className="h-4 w-4 mr-2" />
          {selectedCount > 0
            ? `Exportar ${selectedCount} ${selectedCount === 1 ? 'selecionado' : 'selecionados'}`
            : 'Exportar para Minha Lista'}
        </Button>

        {selectedCount > 0 && (
          <span className="flex items-center text-sm text-muted-foreground" data-testid="custom-list-selection-summary">
            <span className="font-semibold text-primary">
              {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <span className="mx-1">·</span>
            <Button variant="link" size="sm" className="h-8 px-1" onClick={onClearSelection}>
              Limpar
            </Button>
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {secondary.map(({ label, aria, tip, Icon, onClick }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={onClick} disabled={disabled} aria-label={aria} className="min-w-[5.5rem]">
                  <Icon className="h-4 w-4 mr-2" /> {label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomListActionBar;
