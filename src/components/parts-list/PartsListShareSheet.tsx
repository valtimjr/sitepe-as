import React from 'react';
import {
  ClipboardCopy,
  CloudDownload,
  CloudUpload,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileUp,
  MessageCircle,
  Share,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { optionRowClass } from './ListOptionsSheet';
import type { ExportFormat } from './useListActions';

interface PartsListShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEmpty: boolean;
  onCopy: () => void;
  onWhatsApp: () => void;
  onPdf: () => void;
  onNativeShare?: () => void;
  onExport: (format: ExportFormat) => void;
  onImport: () => void;
  onCloudSave: () => void;
  onCloudLoad: () => void;
  onClear: () => void;
}

interface Action {
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  needsItems?: boolean;
  danger?: boolean;
}

/** Gaveta Compartilhar da Minha Lista: Enviar, Arquivo, Nuvem e Limpar. */
const PartsListShareSheet: React.FC<PartsListShareSheetProps> = ({
  open,
  onOpenChange,
  isEmpty,
  onCopy,
  onWhatsApp,
  onPdf,
  onNativeShare,
  onExport,
  onImport,
  onCloudSave,
  onCloudLoad,
  onClear,
}) => {
  const run = (action: () => void) => {
    tap();
    onOpenChange(false);
    action();
  };

  const groups: { title: string; actions: Action[] }[] = [
    {
      title: 'Enviar',
      actions: [
        { label: 'Copiar texto', description: 'Copia para colar em qualquer lugar', Icon: ClipboardCopy, onClick: onCopy, needsItems: true },
        { label: 'Enviar no WhatsApp', description: 'Abre o WhatsApp com a lista', Icon: MessageCircle, onClick: onWhatsApp, needsItems: true },
        { label: 'Exportar PDF', description: 'Gera um arquivo para imprimir ou enviar', Icon: FileDown, onClick: onPdf, needsItems: true },
        ...(onNativeShare
          ? [{ label: 'Compartilhar…', description: 'Enviar por outro aplicativo', Icon: Share, onClick: onNativeShare, needsItems: true }]
          : []),
      ],
    },
    {
      title: 'Arquivo',
      actions: [
        { label: 'Exportar Excel', description: 'Planilha .xlsx', Icon: FileSpreadsheet, onClick: () => onExport('xlsx'), needsItems: true },
        { label: 'Exportar CSV', description: 'Abre no Excel ou Planilhas', Icon: FileText, onClick: () => onExport('csv'), needsItems: true },
        { label: 'Exportar JSON', description: 'Para importar de novo no app', Icon: FileJson, onClick: () => onExport('json'), needsItems: true },
        { label: 'Importar planilha / JSON…', description: 'Traz peças de um arquivo', Icon: FileUp, onClick: onImport },
      ],
    },
    {
      title: 'Nuvem',
      actions: [
        { label: 'Salvar na nuvem', description: 'Guarda uma cópia na sua conta', Icon: CloudUpload, onClick: onCloudSave },
        { label: 'Carregar da nuvem', description: 'Abre uma lista salva', Icon: CloudDownload, onClick: onCloudLoad },
      ],
    },
    {
      title: 'Perigo',
      actions: [
        { label: 'Limpar lista', description: 'Remove todas as peças desta lista', Icon: Trash2, onClick: onClear, needsItems: true, danger: true },
      ],
    },
  ];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="sm:max-w-md" data-testid="parts-list-share-sheet">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Compartilhar</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isEmpty ? 'A lista está vazia. Você ainda pode importar ou carregar da nuvem.' : 'Envie, exporte ou guarde esta lista.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto overscroll-contain -mx-1 px-1">
          {groups.map(({ title, actions }) => (
            <section key={title}>
              <h3 className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
              <div className="space-y-0.5">
                {actions.map(({ label, description, Icon, onClick, needsItems, danger }) => (
                  <button
                    key={label}
                    type="button"
                    className={optionRowClass}
                    disabled={needsItems && isEmpty}
                    onClick={() => run(onClick)}
                    aria-label={label}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', danger ? 'text-destructive' : 'text-primary')} />
                    <span className="min-w-0">
                      <span className={cn('block text-base font-medium', danger && 'text-destructive')}>{label}</span>
                      <span className="block text-xs text-muted-foreground">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default PartsListShareSheet;
