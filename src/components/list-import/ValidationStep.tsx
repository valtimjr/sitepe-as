import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RowStatus, ValidatedRow } from '@/lib/listFileIO';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 500;

interface ValidationStepProps {
  rows: ValidatedRow[];
  enabled: Set<number>;
  onEnabledChange: (enabled: Set<number>) => void;
}

type Filter = 'all' | 'warning' | 'error';

const STATUS_BADGE: Record<RowStatus, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'bg-primary/15 text-primary border-primary/30' },
  warning: { label: 'ALERTA', className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  error: { label: 'ERRO', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

const ValidationStep: React.FC<ValidationStepProps> = ({ rows, enabled, onEnabledChange }) => {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => ({
    total: rows.length,
    ok: rows.filter(r => r.status === 'ok').length,
    warning: rows.filter(r => r.status === 'warning').length,
    error: rows.filter(r => r.status === 'error').length,
  }), [rows]);

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter(r => r.status === filter)),
    [rows, filter]
  );
  const visible = filtered.slice(0, MAX_VISIBLE);

  const selectable = filtered.filter(r => r.status !== 'error');
  const allChecked = selectable.length > 0 && selectable.every(r => enabled.has(r.index));
  const someChecked = selectable.some(r => enabled.has(r.index));

  const toggleAll = (checked: boolean) => {
    const next = new Set(enabled);
    selectable.forEach(r => (checked ? next.add(r.index) : next.delete(r.index)));
    onEnabledChange(next);
  };

  const toggleRow = (index: number, checked: boolean) => {
    const next = new Set(enabled);
    if (checked) next.add(index);
    else next.delete(index);
    onEnabledChange(next);
  };

  const cards = [
    { label: 'TOTAL', value: counts.total, className: 'text-foreground' },
    { label: 'VÁLIDAS', value: counts.ok, className: 'text-primary' },
    { label: 'ALERTAS', value: counts.warning, className: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'ERROS', value: counts.error, className: 'text-destructive' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Validação e Preview</h3>
          <p className="text-sm text-muted-foreground">
            {enabled.size} de {counts.total} {counts.total === 1 ? 'linha selecionada' : 'linhas selecionadas'} para importar
          </p>
        </div>
        <ToggleGroup type="single" value={filter} onValueChange={v => v && setFilter(v as Filter)} className="bg-muted rounded-md p-1 self-start">
          {([['all', 'Todas'], ['warning', 'Alertas'], ['error', 'Erros']] as const).map(([v, l]) => (
            <ToggleGroupItem key={v} value={v} size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {l}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-lg border bg-card p-3" data-testid={`validation-count-${c.label.toLowerCase()}`}>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">{c.label}</p>
            <p className={cn('text-2xl font-bold', c.className)}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border">
        <ScrollArea className="h-[45vh] sm:h-[340px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                    onCheckedChange={v => toggleAll(v === true)}
                    aria-label="Habilitar todas"
                    disabled={selectable.length === 0}
                  />
                </TableHead>
                <TableHead className="w-14">Linha</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="min-w-[160px]">Descrição</TableHead>
                <TableHead>AF</TableHead>
                <TableHead className="w-12 text-center">Qtd</TableHead>
                <TableHead className="min-w-[180px]">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma linha neste filtro.</TableCell>
                </TableRow>
              ) : visible.map(r => (
                <TableRow key={r.index} className={cn(r.status === 'error' && 'opacity-70')}>
                  <TableCell>
                    <Checkbox
                      checked={enabled.has(r.index)}
                      disabled={r.status === 'error'}
                      onCheckedChange={v => toggleRow(r.index, v === true)}
                      aria-label={`Habilitar linha ${r.line}`}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.line}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', STATUS_BADGE[r.status].className)}>
                      {STATUS_BADGE[r.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{r.codigo_peca || '—'}</TableCell>
                  <TableCell className="text-xs">{r.descricao || '—'}</TableCell>
                  <TableCell className="text-xs">{r.af || '—'}</TableCell>
                  <TableCell className="text-center">{r.status === 'error' && r.quantidade === 0 ? '—' : r.quantidade}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.messages.join(' · ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      {filtered.length > MAX_VISIBLE && (
        <p className="text-xs text-muted-foreground">
          Mostrando {MAX_VISIBLE} de {filtered.length} linhas. Todas as linhas habilitadas serão importadas.
        </p>
      )}
    </div>
  );
};

export default ValidationStep;
