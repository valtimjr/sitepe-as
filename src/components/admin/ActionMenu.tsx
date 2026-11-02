import React, { useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import { useIsCompact } from '@/hooks/use-compact';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface ActionMenuAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Pede confirmação antes de executar. */
  confirm?: { title: string; description: string; confirmLabel?: string };
}

interface ActionMenuProps {
  /** Título da folha no celular (ex.: nome do item). */
  title: string;
  /** Itens falsos são ignorados (facilita ações condicionais). */
  actions: Array<ActionMenuAction | false | null | undefined>;
  triggerLabel?: string;
  triggerClassName?: string;
}

/** Botão ⋯: folha de baixo com linhas de 56px no celular, dropdown na web. */
const ActionMenu: React.FC<ActionMenuProps> = ({ title, actions, triggerLabel, triggerClassName }) => {
  const isCompact = useIsCompact();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState<ActionMenuAction | null>(null);

  const run = (action: ActionMenuAction) => {
    setSheetOpen(false);
    if (action.confirm) setPending(action);
    else action.onSelect();
  };

  const visible = actions.filter((a): a is ActionMenuAction => !!a);
  const regular = visible.filter(a => !a.destructive);
  const destructive = visible.filter(a => a.destructive);

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-10 w-10 shrink-0', triggerClassName)}
      aria-label={triggerLabel ?? `Ações de ${title}`}
      data-testid="row-actions"
      onClick={e => {
        e.stopPropagation();
        if (isCompact) {
          tap();
          setSheetOpen(true);
        }
      }}
    >
      <MoreHorizontal className="h-5 w-5" />
    </Button>
  );

  return (
    <>
      {isCompact ? (
        <>
          {trigger}
          <ResponsiveDialog open={sheetOpen} onOpenChange={setSheetOpen}>
            <ResponsiveDialogContent data-testid="action-sheet">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle className="line-clamp-2 break-words">{title}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="sr-only">Ações disponíveis</ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <div className="-mx-4 divide-y divide-border/60 border-y">
                {[...regular, ...destructive].map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      disabled={action.disabled}
                      onClick={() => run(action)}
                      className={cn(
                        'flex h-14 w-full items-center gap-3 px-4 text-left text-base font-medium active:bg-muted disabled:opacity-40',
                        action.destructive && 'text-destructive',
                      )}
                    >
                      {Icon && <Icon className="h-5 w-5 shrink-0" />}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </>
      ) : (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]" onClick={e => e.stopPropagation()}>
            {regular.map(action => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem key={action.label} disabled={action.disabled} onSelect={() => run(action)}>
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </DropdownMenuItem>
              );
            })}
            {destructive.length > 0 && regular.length > 0 && <DropdownMenuSeparator />}
            {destructive.map(action => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.label}
                  disabled={action.disabled}
                  onSelect={() => run(action)}
                  className="text-destructive focus:text-destructive"
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AlertDialog open={pending !== null} onOpenChange={open => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                pending?.onSelect();
                setPending(null);
              }}
            >
              {pending?.confirm?.confirmLabel ?? 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActionMenu;
