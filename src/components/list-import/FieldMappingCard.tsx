import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FieldMapping, ImportFieldDef, MappingMode, TextTransform } from '@/lib/listFileIO';
import { cn } from '@/lib/utils';

interface FieldMappingCardProps {
  field: ImportFieldDef;
  mapping: FieldMapping;
  headers: string[];
  sampleRow?: string[];
  onChange: (mapping: FieldMapping) => void;
}

const TRANSFORMS: { value: TextTransform; label: string; title: string }[] = [
  { value: 'upper', label: 'AA', title: 'Maiúsculas' },
  { value: 'lower', label: 'aa', title: 'Minúsculas' },
  { value: 'capitalize', label: 'Aa', title: 'Capitalizar' },
];

const FieldMappingCard: React.FC<FieldMappingCardProps> = ({ field, mapping, headers, sampleRow, onChange }) => {
  const update = (patch: Partial<FieldMapping>) => onChange({ ...mapping, ...patch });
  const sample = mapping.column !== null ? sampleRow?.[mapping.column] : undefined;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3" data-testid={`mapping-card-${field.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
          {field.type === 'number' ? 'NÚMERO' : 'TEXTO'}
        </Badge>
        <span className="font-semibold">{field.label}</span>
        <code className="text-xs text-muted-foreground">{field.id}</code>
        <span className="ml-auto text-xs text-muted-foreground">{field.requirement}</span>
      </div>

      <ToggleGroup
        type="single"
        value={mapping.mode}
        onValueChange={v => v && update({ mode: v as MappingMode })}
        className="justify-start bg-muted rounded-md p-1 w-full sm:w-auto"
      >
        {([['column', 'Usar coluna'], ['fixed', 'Valor fixo'], ['ignore', 'Ignorar']] as const).map(([v, l]) => (
          <ToggleGroupItem
            key={v}
            value={v}
            size="sm"
            className="flex-1 sm:flex-none data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {l}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {mapping.mode === 'column' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Select
            value={mapping.column !== null ? String(mapping.column) : undefined}
            onValueChange={v => update({ column: Number(v) })}
          >
            <SelectTrigger className="sm:w-64" aria-label={`Coluna para ${field.label}`}>
              <SelectValue placeholder="Selecione a coluna" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
          {mapping.column !== null && (
            <span className="text-xs text-muted-foreground truncate">
              Amostra: <span className="text-foreground font-medium">{sample || '(vazio)'}</span>
            </span>
          )}
        </div>
      )}

      {mapping.mode === 'fixed' && (
        <Input
          value={mapping.fixedValue}
          type={field.type === 'number' ? 'number' : 'text'}
          onChange={e => update({ fixedValue: e.target.value })}
          placeholder={field.type === 'number' ? 'Ex.: 1' : `Valor de ${field.label} para todas as linhas`}
          className="sm:w-64"
          aria-label={`Valor fixo para ${field.label}`}
        />
      )}

      {field.type === 'text' && mapping.mode !== 'ignore' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t">
          <span className="text-xs font-medium text-muted-foreground pt-2">Transformação</span>
          {TRANSFORMS.map(t => (
            <div key={t.value} className="flex items-center gap-1.5 pt-2" title={t.title}>
              <Checkbox
                id={`${field.id}-${t.value}`}
                checked={mapping.transform === t.value}
                onCheckedChange={v => update({ transform: v === true ? t.value : 'none' })}
              />
              <Label htmlFor={`${field.id}-${t.value}`} className={cn('cursor-pointer font-mono text-xs')}>{t.label}</Label>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-2">
            <Checkbox
              id={`${field.id}-trim`}
              checked={mapping.trim}
              onCheckedChange={v => update({ trim: v === true })}
            />
            <Label htmlFor={`${field.id}-trim`} className="cursor-pointer text-xs">aparar espaços</Label>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldMappingCard;
