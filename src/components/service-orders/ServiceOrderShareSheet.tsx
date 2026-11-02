import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCopy, FileChartLine, FileDown } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ServiceOrderShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  selectedCount: number;
  disabled: boolean;
  onCopy: () => void;
  onWhatsApp: () => void;
  onPdf: () => void;
  /** Link do Relatório Geral (só admin/moderador). */
  reportPath?: string;
}

const rowClass =
  'flex w-full min-h-14 items-center gap-3 rounded-lg px-3 text-left text-base font-medium transition-colors active:bg-muted hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none';

/** Gaveta Compartilhar: Copiar, WhatsApp, PDF e Relatório Geral. */
const ServiceOrderShareSheet: React.FC<ServiceOrderShareSheetProps> = ({
  open,
  onOpenChange,
  dateLabel,
  selectedCount,
  disabled,
  onCopy,
  onWhatsApp,
  onPdf,
  reportPath,
}) => {
  const run = (action: () => void) => {
    tap();
    onOpenChange(false);
    action();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="sm:max-w-md" data-testid="os-share-sheet">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Compartilhar — {dateLabel}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {selectedCount > 0
              ? `Compartilhar ${selectedCount} OS ${selectedCount === 1 ? 'selecionada' : 'selecionadas'}`
              : disabled
                ? 'Nenhuma OS neste dia.'
                : 'Todas as OS do dia'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-1">
          <button type="button" className={rowClass} disabled={disabled} onClick={() => run(onCopy)}>
            <ClipboardCopy className="h-5 w-5 text-primary" /> Copiar texto
          </button>
          <button type="button" className={rowClass} disabled={disabled} onClick={() => run(onWhatsApp)}>
            <img src="/icons/whatsapp.png" alt="" className="h-6 w-6" /> Enviar no WhatsApp
          </button>
          <button type="button" className={rowClass} disabled={disabled} onClick={() => run(onPdf)}>
            <FileDown className="h-5 w-5 text-primary" /> Gerar PDF
          </button>
          {reportPath && (
            <>
              <div className="my-1 border-t" />
              <Link to={reportPath} className={cn(rowClass)} onClick={() => onOpenChange(false)}>
                <FileChartLine className="h-5 w-5 text-primary" /> Abrir Relatório Geral
              </Link>
            </>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default ServiceOrderShareSheet;
