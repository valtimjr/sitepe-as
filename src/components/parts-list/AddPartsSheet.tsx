import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AfSearchInput from '@/components/AfSearchInput';
import PartItemForm from '@/components/PartItemForm';
import PartPickerSheet from '@/components/service-orders/PartPickerSheet';
import type { PickedPart } from '@/components/service-orders/mergeParts';
import { useAfs } from './useAfs';

interface AddPartsSheetProps {
  onOpenChange: (open: boolean) => void;
  listName: string;
  /** Peças escolhidas + AF opcional aplicado a todas. */
  onConfirm: (parts: PickedPart[], af: string) => void;
  /** Uma peça salva pelo formulário detalhado. */
  onDetailedAdded: () => void;
}

/** Gaveta "Adicionar peças" da Minha Lista: a das OS com campo AF e o formulário detalhado. */
const AddPartsSheet: React.FC<AddPartsSheetProps> = ({ onOpenChange, listName, onConfirm, onDetailedAdded }) => {
  const [mode, setMode] = useState<'picker' | 'detailed'>('picker');
  const [af, setAf] = useState('');
  const afs = useAfs();

  if (mode === 'detailed') {
    return (
      <Sheet open onOpenChange={onOpenChange}>
        <ResponsiveSheetContent
          fixedHeight
          className="w-full sm:max-w-lg"
          data-testid="add-part-detailed-sheet"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 border-b shrink-0 flex items-start gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 -ml-2 shrink-0"
              aria-label="Voltar à busca"
              onClick={() => setMode('picker')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetHeader className="text-left space-y-0.5 pr-8">
              <SheetTitle>Uma peça detalhada</SheetTitle>
              <SheetDescription className="truncate">Adicionar em {listName}</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <PartItemForm
              bare
              onItemAdded={() => {
                onDetailedAdded();
                onOpenChange(false);
              }}
            />
          </div>
        </ResponsiveSheetContent>
      </Sheet>
    );
  }

  return (
    <PartPickerSheet
      open
      onOpenChange={onOpenChange}
      subtitle={`Adicionar em ${listName}`}
      onConfirm={(parts) => onConfirm(parts, af.trim())}
      detailedAction={{ label: 'Uma peça detalhada (nome, AF, tags)', onClick: () => setMode('detailed') }}
      footerExtra={
        <div className="px-4 pt-2" data-testid="add-parts-af">
          <Label htmlFor="af-input" className="text-xs text-muted-foreground">
            AF (opcional, vale para todas)
          </Label>
          <AfSearchInput
            value={af}
            onChange={setAf}
            onSelectAf={setAf}
            availableAfs={afs}
            dropUp
            inputProps={{ className: 'h-11 text-base mt-1', enterKeyHint: 'done', placeholder: 'AF (opcional)' }}
          />
        </div>
      }
    />
  );
};

export default AddPartsSheet;
