import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ActionMenu from '@/components/admin/ActionMenu';
import DragHandle from '@/components/sortable/DragHandle';
import ListIcon from '@/components/list-icon/ListIcon';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/responsive/ResponsivePopover';
import { cn } from '@/lib/utils';
import type { CustomList, CustomListItem, MangueiraPartDetails } from '@/types/supabase';

interface ListItemBlockProps {
  item: CustomListItem;
  list: Pick<CustomList, 'title' | 'icon'>;
  isCompact: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (item: CustomListItem) => void;
  onMove: (item: CustomListItem, direction: 'up' | 'down') => void;
  onDelete: (item: CustomListItem) => void;
}

const PartLines: React.FC<{ label: string; part: MangueiraPartDetails }> = ({ label, part }) => (
  <div className="min-w-0">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <p className="break-words text-sm font-medium text-primary">Cód.: {part.codigo}</p>
    {part.name && <p className="break-words text-sm">{part.name}</p>}
    {part.description && <p className="break-words text-xs italic text-muted-foreground">{part.description}</p>}
  </div>
);

/** Bloco de um item da lista: [alça] [conteúdo por tipo] [ações]. */
const ListItemBlock: React.FC<ListItemBlockProps> = ({ item, list, isCompact, isFirst, isLast, onEdit, onMove, onDelete }) => {
  const [relatedOpen, setRelatedOpen] = useState(false);
  const type = item.type || 'item';
  const label = type === 'separator' ? 'Separador' : item.item_name;

  const content = (() => {
    if (type === 'separator') {
      return (
        <div className="flex flex-1 items-center gap-2 py-3" aria-label="Separador">
          <span className="h-px flex-1 border-t-2 border-dashed border-foreground/40" />
          <span className="text-xs text-muted-foreground">Separador</span>
          <span className="h-px flex-1 border-t-2 border-dashed border-foreground/40" />
        </div>
      );
    }
    if (type === 'subtitle') {
      const inherited = !item.icon;
      return (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 py-2">
          <span className="relative shrink-0">
            <ListIcon
              name={inherited ? list.title : item.item_name}
              icon={item.icon ?? list.icon ?? null}
              size="sm"
              className="h-9 w-9 rounded-md"
            />
          </span>
          <span className="min-w-0 flex-1 break-words text-base font-bold text-primary">{item.item_name}</span>
          {inherited && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground" data-testid="icon-inherited">
              herdado
            </span>
          )}
        </div>
      );
    }
    if (type === 'mangueira' && item.mangueira_data) {
      const data = item.mangueira_data;
      return (
        <div className="min-w-0 flex-1 space-y-2 py-2" data-testid="hose-block">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <PartLines label="Mangueira" part={data.mangueira} />
            </div>
            <div className="shrink-0 rounded-md bg-muted px-2 py-1 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Corte</span>
              <span className="text-base font-semibold">{data.corte_cm} cm</span>
            </div>
          </div>
          <div className={cn('grid gap-2', !isCompact && 'grid-cols-2')}>
            <PartLines label="Conexão 1" part={data.conexao1} />
            <PartLines label="Conexão 2" part={data.conexao2} />
          </div>
        </div>
      );
    }
    const related = item.itens_relacionados ?? [];
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2.5 py-2">
        <span className="mt-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-sm font-semibold text-primary">
          {item.quantity}
        </span>
        <div className="min-w-0 flex-1">
          {item.part_code && <p className="break-words text-sm font-medium text-primary">Cód.: {item.part_code}</p>}
          <p className={cn('break-words text-sm', !item.part_code && 'font-medium')}>{item.item_name}</p>
          {item.description && <p className="break-words text-xs italic text-muted-foreground">{item.description}</p>}
          {related.length > 0 && (
            <ResponsivePopover open={relatedOpen} onOpenChange={setRelatedOpen} modal={false}>
              <ResponsivePopoverTrigger>
                <Button variant="link" size="sm" className="h-8 gap-1 px-0 text-blue-600 dark:text-blue-400">
                  <Tag className="h-3.5 w-3.5" /> {related.length} {related.length === 1 ? 'relacionado' : 'relacionados'}
                </Button>
              </ResponsivePopoverTrigger>
              <ResponsivePopoverContent title="Itens relacionados" popoverClassName="w-auto max-w-xs p-2">
                <ScrollArea className="max-h-96">
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {related.map(rel => (
                      <li key={rel.codigo}>
                        <RelatedPartDisplay item={rel} />
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </ResponsivePopoverContent>
            </ResponsivePopover>
          )}
        </div>
      </div>
    );
  })();

  return (
    <div
      className={cn('group flex items-center gap-1 pr-0.5', type === 'subtitle' && 'bg-accent/10')}
      data-testid="list-item-block"
      data-type={type}
      id={item.id}
    >
      <DragHandle />
      {content}
      {!isCompact && (
        <div className="flex shrink-0 items-center">
          {type !== 'separator' && (
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(item)} aria-label={`Editar ${label}`}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" aria-label={`Excluir ${label}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                <AlertDialogDescription>"{label}" será removido da lista. Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(item)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <ActionMenu
        title={label}
        actions={[
          type !== 'separator' && { label: 'Editar', icon: Pencil, onSelect: () => onEdit(item) },
          { label: 'Mover para cima', icon: ArrowUp, onSelect: () => onMove(item, 'up'), disabled: isFirst },
          { label: 'Mover para baixo', icon: ArrowDown, onSelect: () => onMove(item, 'down'), disabled: isLast },
          {
            label: 'Excluir',
            icon: Trash2,
            destructive: true,
            onSelect: () => onDelete(item),
            confirm: { title: 'Excluir item?', description: `"${label}" será removido da lista. Esta ação não pode ser desfeita.` },
          },
        ]}
      />
    </div>
  );
};

export default ListItemBlock;
