import React from 'react';
import { Clipboard, CloudUpload, Copy, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import type { LocalList } from '@/services/localListStorage';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ListOptionsSheetProps {
  list: LocalList | null;
  canDelete: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (list: LocalList) => void;
  onDuplicate: (list: LocalList) => void;
  onCloudSave: (list: LocalList) => void;
  onCloudUpdate: (list: LocalList) => void;
  onCopy: (list: LocalList) => void;
  onDelete: (list: LocalList) => void;
}

export const optionRowClass =
  'flex w-full min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors active:bg-muted hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none';

/** Gaveta "Opções da lista" (renomear, duplicar, nuvem, copiar e excluir). */
const ListOptionsSheet: React.FC<ListOptionsSheetProps> = ({
  list,
  canDelete,
  saving,
  onOpenChange,
  onRename,
  onDuplicate,
  onCloudSave,
  onCloudUpdate,
  onCopy,
  onDelete,
}) => {
  const run = (action: (l: LocalList) => void) => {
    if (!list) return;
    tap();
    onOpenChange(false);
    action(list);
  };

  const actions = [
    { label: 'Renomear / Ícone', description: 'Nome e ícone da lista', Icon: Pencil, onClick: onRename },
    { label: 'Duplicar', description: 'Cria uma cópia com as mesmas peças', Icon: Copy, onClick: onDuplicate },
    { label: 'Salvar na nuvem', description: 'Guarda uma cópia na sua conta', Icon: saving ? Loader2 : CloudUpload, onClick: onCloudSave, disabled: saving },
    {
      label: 'Atualizar na nuvem',
      description: list?.cloudId ? 'Mantém a versão mais nova (local ou nuvem)' : 'Esta lista ainda não foi salva na nuvem',
      Icon: RefreshCw,
      onClick: onCloudUpdate,
      disabled: !list?.cloudId || saving,
    },
    { label: 'Copiar', description: 'Copia o texto da lista', Icon: Clipboard, onClick: onCopy },
    {
      label: 'Excluir',
      description: canDelete ? 'Apaga esta lista' : 'Não é possível excluir a única lista',
      Icon: Trash2,
      onClick: onDelete,
      disabled: !canDelete,
      danger: true,
    },
  ];

  return (
    <ResponsiveDialog open={!!list} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="sm:max-w-md" data-testid="list-options-sheet">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Opções da lista</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="truncate">{list?.name}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-1">
          {actions.map(({ label, description, Icon, onClick, disabled, danger }) => (
            <button
              key={label}
              type="button"
              className={optionRowClass}
              disabled={disabled}
              onClick={() => run(onClick)}
              aria-label={label}
            >
              <Icon
                className={cn('h-5 w-5 shrink-0', danger ? 'text-destructive' : 'text-primary', Icon === Loader2 && 'animate-spin')}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className={cn('block text-base font-medium', danger && 'text-destructive')}>{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default ListOptionsSheet;
