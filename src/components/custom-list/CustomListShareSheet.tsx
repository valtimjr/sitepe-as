import React from 'react';
import { ClipboardCopy, FileDown, FileSpreadsheet, Share } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import { tap } from '@/lib/haptics';

interface CustomListShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  disabled: boolean;
  onCopy: () => void;
  onPdf: () => void;
  onCsv: () => void;
  /** Compartilhamento nativo do sistema (só quando o aparelho suporta). */
  onNativeShare?: () => void;
}

const rowClass =
  'flex w-full min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors active:bg-muted hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none';

/** Gaveta Compartilhar da lista: Copiar, PDF e CSV. */
const CustomListShareSheet: React.FC<CustomListShareSheetProps> = ({
  open,
  onOpenChange,
  selectedCount,
  disabled,
  onCopy,
  onPdf,
  onCsv,
  onNativeShare,
}) => {
  const run = (action: () => void) => {
    tap();
    onOpenChange(false);
    action();
  };

  const actions = [
    { label: 'Copiar texto', description: 'Copia para colar no WhatsApp', Icon: ClipboardCopy, onClick: onCopy },
    { label: 'Exportar PDF', description: 'Gera um arquivo para imprimir ou enviar', Icon: FileDown, onClick: onPdf },
    { label: 'Exportar CSV (planilha)', description: 'Abre no Excel ou Planilhas', Icon: FileSpreadsheet, onClick: onCsv },
    ...(onNativeShare
      ? [{ label: 'Compartilhar…', description: 'Enviar por outro aplicativo', Icon: Share, onClick: onNativeShare }]
      : []),
  ];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="sm:max-w-md" data-testid="custom-list-share-sheet">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Compartilhar</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {disabled ? (
              'Nenhum item nesta lista.'
            ) : (
              <>
                Aplicar a:{' '}
                <span className="font-semibold text-foreground">
                  {selectedCount > 0
                    ? `${selectedCount} ${selectedCount === 1 ? 'selecionado' : 'selecionados'}`
                    : 'todos os itens'}
                </span>
              </>
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-1">
          {actions.map(({ label, description, Icon, onClick }) => (
            <button
              key={label}
              type="button"
              className={rowClass}
              disabled={disabled}
              onClick={() => run(onClick)}
              aria-label={label}
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-base font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default CustomListShareSheet;
