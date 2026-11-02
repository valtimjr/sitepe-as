import React from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface AdminItemAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
}

interface AdminItemCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  selected?: boolean;
  onSelectedChange?: (checked: boolean) => void;
  onOpen?: () => void;
  actions: AdminItemAction[];
}

/** Card compacto do Painel no celular (Peças, AFs, Convites). */
const AdminItemCard: React.FC<AdminItemCardProps> = ({ title, subtitle, meta, badge, selected, onSelectedChange, onOpen, actions }) => (
  <div
    className={cn(
      'flex items-start gap-3 rounded-none border bg-card px-3 py-2.5 text-card-foreground shadow-sm',
      onOpen && 'cursor-pointer active:bg-muted',
      selected && 'border-primary/60 bg-primary/5',
    )}
    onClick={onOpen}
    data-testid="admin-item-card"
  >
    {onSelectedChange && (
      <span className="pt-0.5" onClick={e => e.stopPropagation()}>
        <Checkbox checked={!!selected} onCheckedChange={c => onSelectedChange(c === true)} aria-label="Selecionar" />
      </span>
    )}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate font-semibold">{title}</span>
        {badge}
      </div>
      {subtitle && <div className="truncate text-sm text-muted-foreground">{subtitle}</div>}
      {meta && <div className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</div>}
    </div>
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-1 -mt-1 h-8 w-8 shrink-0"
          onClick={e => e.stopPropagation()}
          aria-label="Ações do item"
          data-testid="admin-item-actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        {actions.map(a => (
          <DropdownMenuItem key={a.label} onSelect={a.onSelect} className={cn(a.destructive && 'text-destructive')}>
            <a.icon className="mr-2 h-4 w-4" /> {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export default AdminItemCard;
