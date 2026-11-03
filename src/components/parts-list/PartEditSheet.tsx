import React, { useState } from 'react';
import { ChevronDown, Tag, Trash2 } from 'lucide-react';
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AfSearchInput from '@/components/AfSearchInput';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import QuantityStepper from '@/components/service-orders/QuantityStepper';
import type { SimplePartItem } from '@/services/partListService';
import type { RelatedPart } from '@/types/supabase';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { cn } from '@/lib/utils';
import { useAfs } from './useAfs';

interface PartEditSheetProps {
  item: SimplePartItem;
  /** Nome atual (do item ou do catálogo), usado como valor inicial. */
  name?: string;
  related: RelatedPart[];
  onOpenChange: (open: boolean) => void;
  onSave: (item: SimplePartItem) => void;
  /** Abre a confirmação de exclusão (a gaveta fecha se confirmar). */
  onRequestDelete: (id: string) => void;
}

/** Gaveta "Editar peça" (montada só quando aberta). */
const PartEditSheet: React.FC<PartEditSheetProps> = ({ item, name, related, onOpenChange, onSave, onRequestDelete }) => {
  const keyboardOpen = useKeyboardOpen();
  const afs = useAfs();
  const [code, setCode] = useState(item.codigo_peca || '');
  const [partName, setPartName] = useState(name || '');
  const [desc, setDesc] = useState(item.descricao || '');
  const [af, setAf] = useState(item.af || '');
  const [qty, setQty] = useState<number | ''>(item.quantidade ?? 1);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!code.trim() && !desc.trim()) {
      setError('Informe o código ou a descrição.');
      return;
    }
    if (qty === '' || qty <= 0) {
      setError('O valor da quantidade tem que ser maior que "0"');
      return;
    }
    onSave({ ...item, codigo_peca: code.trim(), name: partName.trim() || undefined, descricao: desc.trim(), af: af.trim() || undefined, quantidade: qty });
    onOpenChange(false);
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <ResponsiveSheetContent
        fixedHeight
        className="w-full sm:max-w-lg"
        data-testid="part-edit-sheet"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetHeader className="text-left space-y-0.5 pr-8">
            <SheetTitle>Editar peça</SheetTitle>
            <SheetDescription className="truncate">{item.codigo_peca || item.descricao}</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-part-code">Código</Label>
            <Input
              id="edit-part-code"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              autoComplete="off"
              className="h-11 text-base font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-part-name">Nome (opcional)</Label>
            <Input
              id="edit-part-name"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              autoComplete="off"
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-part-desc">Descrição</Label>
            <Input
              id="edit-part-desc"
              value={desc}
              onChange={(e) => { setDesc(e.target.value); setError(null); }}
              autoComplete="off"
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="af-input">AF (opcional)</Label>
            <AfSearchInput
              value={af}
              onChange={setAf}
              onSelectAf={setAf}
              availableAfs={afs}
              inputProps={{ className: 'h-11 text-base', enterKeyHint: 'done' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quantidade</Label>
            <QuantityStepper
              value={qty}
              onChange={(v) => { setQty(v); setError(null); }}
              error={!!error && (qty === '' || qty <= 0)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {related.length > 0 && (
            <Collapsible className="rounded-lg border">
              <CollapsibleTrigger className="group flex w-full min-h-11 items-center justify-between px-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" /> Itens relacionados ({related.length})
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t px-3 py-2 space-y-1 text-xs text-muted-foreground">
                {related.map((rel) => (
                  <RelatedPartDisplay key={rel.codigo} item={rel} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <div className={cn('shrink-0 border-t bg-background px-4 pt-2', keyboardOpen ? 'pb-3' : 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]')}>
          {!keyboardOpen && (
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 mb-2 text-destructive hover:text-destructive"
              onClick={() => onRequestDelete(item.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir peça
            </Button>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1 h-11" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </ResponsiveSheetContent>
    </Sheet>
  );
};

export default PartEditSheet;
