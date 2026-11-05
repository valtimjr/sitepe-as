import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsCompact } from '@/hooks/use-compact';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface ReportFilters {
  userId: string;
  professionCode: string;
  shiftCode: string;
  digitado: 'all' | 'sim' | 'nao';
  afSearch: string;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  userId: 'all',
  professionCode: 'all',
  shiftCode: 'all',
  digitado: 'all',
  afSearch: '',
};

export interface FilterUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  badge: string | null;
}

type Option = { name: string; ref_code: number | null };

interface ReportFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  users: FilterUser[];
  professions: Option[];
  shifts: Option[];
  /** Quantas OS o rascunho traria (calculado em memória). */
  previewCount: (draft: ReportFilters) => number;
}

const DIGITADO_OPTIONS: Array<{ value: ReportFilters['digitado']; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'sim', label: 'Digitadas' },
  { value: 'nao', label: 'Pendentes' },
];

const userName = (u: FilterUser) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuário sem nome';

const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  open,
  onOpenChange,
  value,
  onApply,
  users,
  professions,
  shifts,
  previewCount,
}) => {
  const isCompact = useIsCompact();
  const [draft, setDraft] = useState<ReportFilters>(value);

  // O rascunho recomeça do filtro aplicado sempre que o painel abre
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const count = useMemo(() => (open ? previewCount(draft) : 0), [open, draft, previewCount]);
  const update = (patch: Partial<ReportFilters>) => setDraft(d => ({ ...d, ...patch }));

  const apply = () => {
    tap();
    onApply(draft);
    onOpenChange(false);
  };

  const body = (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase font-bold">Usuário</Label>
        <Command className="rounded-md border">
          <CommandInput placeholder="Buscar por nome ou crachá..." />
          <CommandList className="max-h-48">
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="todos os usuarios" onSelect={() => update({ userId: 'all' })} className="min-h-10">
                <Check className={cn('mr-2 h-4 w-4', draft.userId === 'all' ? 'opacity-100' : 'opacity-0')} />
                Todos os usuários
              </CommandItem>
              {users.map(u => (
                <CommandItem
                  key={u.id}
                  value={`${userName(u)} ${u.badge || ''} ${u.id}`.toLowerCase()}
                  onSelect={() => update({ userId: u.id })}
                  className="min-h-10"
                >
                  <Check className={cn('mr-2 h-4 w-4', draft.userId === u.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">
                    {userName(u)} {u.badge ? `(${u.badge})` : ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-af-search" className="text-xs uppercase font-bold">Pesquisar AF</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="report-af-search"
            placeholder="Número ou descrição..."
            className="pl-8 h-10"
            value={draft.afSearch}
            onChange={e => update({ afSearch: e.target.value })}
            onFocus={e => e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase font-bold">Profissão</Label>
          <Select value={draft.professionCode} onValueChange={v => update({ professionCode: v })}>
            <SelectTrigger className="h-10" aria-label="Profissão"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {professions.filter(p => p.ref_code !== null).map(p => (
                <SelectItem key={p.ref_code} value={p.ref_code!.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase font-bold">Turno</Label>
          <Select value={draft.shiftCode} onValueChange={v => update({ shiftCode: v })}>
            <SelectTrigger className="h-10" aria-label="Turno"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {shifts.filter(s => s.ref_code !== null).map(s => (
                <SelectItem key={s.ref_code} value={s.ref_code!.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase font-bold">Status Digitado</Label>
        <ToggleGroup
          type="single"
          value={draft.digitado}
          onValueChange={v => v && update({ digitado: v as ReportFilters['digitado'] })}
          className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
          data-testid="report-filter-digitado"
        >
          {DIGITADO_OPTIONS.map(o => (
            <ToggleGroupItem
              key={o.value}
              value={o.value}
              className="h-10 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm"
            >
              {o.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );

  const footer = (
    <div className="flex gap-2 border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <Button variant="outline" className="h-11 flex-1" onClick={() => setDraft(DEFAULT_REPORT_FILTERS)}>
        Limpar filtros
      </Button>
      <Button className="h-11 flex-1" onClick={apply} data-testid="report-filter-apply">
        Aplicar ({count} OS)
      </Button>
    </div>
  );

  if (isCompact) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[92vh] rounded-none" data-testid="report-filter-panel">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>Filtros</DrawerTitle>
            <DrawerDescription>As mudanças valem ao tocar em Aplicar.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{body}</div>
          {footer}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md" data-testid="report-filter-panel">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>As mudanças valem ao clicar em Aplicar.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{body}</div>
        {footer}
      </SheetContent>
    </Sheet>
  );
};

export default ReportFilterPanel;
