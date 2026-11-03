import React from 'react';
import { Car, ClipboardList } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { tap } from '@/lib/haptics';

interface OsTypeToggleProps {
  isPercurso: boolean;
  onChange: (isPercurso: boolean) => void;
}

/** Controle segmentado OS | Percurso (azul na OS, vermelho no Percurso). */
const OsTypeToggle: React.FC<OsTypeToggleProps> = ({ isPercurso, onChange }) => (
  <ToggleGroup
    type="single"
    value={isPercurso ? 'percurso' : 'os'}
    onValueChange={(v) => {
      if (!v) return;
      tap();
      onChange(v === 'percurso');
    }}
    className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 h-12"
    aria-label="Tipo de registro"
    data-testid="os-type-toggle"
  >
    <ToggleGroupItem
      value="os"
      className="h-10 rounded-lg text-base font-semibold data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=on]:shadow"
    >
      <ClipboardList className="h-4 w-4 mr-1.5" /> OS
    </ToggleGroupItem>
    <ToggleGroupItem
      value="percurso"
      className="h-10 rounded-lg text-base font-semibold data-[state=on]:bg-red-600 data-[state=on]:text-white data-[state=on]:shadow"
    >
      <Car className="h-4 w-4 mr-1.5" /> Percurso
    </ToggleGroupItem>
  </ToggleGroup>
);

export default OsTypeToggle;
