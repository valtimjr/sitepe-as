import React from 'react';
import { ListPlus, Replace, FilePlus2, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export type ImportTarget = 'append' | 'replace' | 'new';

interface ImportTargetStepProps {
  count: number;
  activeListName: string;
  target: ImportTarget;
  onTargetChange: (target: ImportTarget) => void;
  newListName: string;
  onNewListNameChange: (name: string) => void;
  mergeDuplicates: boolean;
  onMergeDuplicatesChange: (value: boolean) => void;
}

const ImportTargetStep: React.FC<ImportTargetStepProps> = ({
  count, activeListName, target, onTargetChange, newListName, onNewListNameChange, mergeDuplicates, onMergeDuplicatesChange,
}) => {
  const options = [
    { value: 'append' as const, icon: ListPlus, title: 'Adicionar à lista atual', desc: `"${activeListName}"` },
    { value: 'replace' as const, icon: Replace, title: 'Substituir itens da lista atual', desc: `Os itens atuais de "${activeListName}" serão removidos.` },
    { value: 'new' as const, icon: FilePlus2, title: 'Criar nova lista', desc: 'Os itens vão para uma lista nova, que ficará ativa.' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Onde colocar {count === 1 ? 'o item selecionado' : `os ${count} itens selecionados`}?
      </h3>

      <RadioGroup value={target} onValueChange={v => onTargetChange(v as ImportTarget)} className="grid gap-3">
        {options.map(o => (
          <Label
            key={o.value}
            htmlFor={`import-target-${o.value}`}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-card p-4 cursor-pointer transition-colors font-normal',
              target === o.value ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'
            )}
          >
            <RadioGroupItem value={o.value} id={`import-target-${o.value}`} className="mt-1" />
            <o.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">{o.title}</p>
              <p className={cn('text-sm', o.value === 'replace' ? 'text-destructive flex items-center gap-1' : 'text-muted-foreground')}>
                {o.value === 'replace' && <AlertTriangle className="h-3.5 w-3.5" />}
                {o.desc}
              </p>
              {o.value === 'new' && target === 'new' && (
                <Input
                  value={newListName}
                  onChange={e => onNewListNameChange(e.target.value)}
                  placeholder="Nome da nova lista"
                  className="mt-2"
                  aria-label="Nome da nova lista"
                />
              )}
            </div>
          </Label>
        ))}
      </RadioGroup>

      <div className="flex items-center gap-2">
        <Checkbox id="import-merge-duplicates" checked={mergeDuplicates} onCheckedChange={v => onMergeDuplicatesChange(v === true)} />
        <Label htmlFor="import-merge-duplicates" className="cursor-pointer">
          Somar quantidades de itens repetidos (mesmo código + AF)
        </Label>
      </div>
    </div>
  );
};

export default ImportTargetStep;
