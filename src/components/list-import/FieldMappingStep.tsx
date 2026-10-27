import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { IMPORT_FIELDS, ImportField, MappingConfig } from '@/lib/listFileIO';
import FieldMappingCard from './FieldMappingCard';

interface FieldMappingStepProps {
  headers: string[];
  sampleRow?: string[];
  mapping: MappingConfig;
  onMappingChange: (mapping: MappingConfig) => void;
  fillDescription: boolean;
  onFillDescriptionChange: (value: boolean) => void;
}

const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  headers, sampleRow, mapping, onMappingChange, fillDescription, onFillDescriptionChange,
}) => {
  const isUsed = (field: ImportField) => mapping[field].mode !== 'ignore';
  const missingRequired = !isUsed('codigo_peca') && !isUsed('descricao');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Mapeamento de Colunas</h3>
        <p className="text-sm text-muted-foreground">Associe as colunas da planilha aos campos da Minha Lista</p>
      </div>

      {missingRequired && (
        <p className="text-sm text-destructive">Mapeie pelo menos o Código da Peça ou a Descrição.</p>
      )}

      <div className="grid gap-3">
        {IMPORT_FIELDS.map(field => (
          <FieldMappingCard
            key={field.id}
            field={field}
            mapping={mapping[field.id]}
            headers={headers}
            sampleRow={sampleRow}
            onChange={m => onMappingChange({ ...mapping, [field.id]: m })}
          />
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <Checkbox
          id="import-fill-description"
          checked={fillDescription}
          onCheckedChange={v => onFillDescriptionChange(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="import-fill-description" className="cursor-pointer leading-snug">
          Completar descrição pelo cadastro de peças
          <span className="block text-xs font-normal text-muted-foreground">
            Quando a linha tem código e não tem descrição, usa a descrição do cadastro.
          </span>
        </Label>
      </div>
    </div>
  );
};

export default FieldMappingStep;
