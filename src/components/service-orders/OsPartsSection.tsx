import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PlusCircle, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuantityStepper from './QuantityStepper';
import { mergeParts, partKey, type PickedPart } from './mergeParts';

const PartPickerSheet = lazy(() => import('./PartPickerSheet'));

export type PartsAction =
  | { type: 'reset'; parts: PickedPart[] }
  | { type: 'add'; parts: PickedPart[] }
  | { type: 'setQty'; index: number; quantidade: number }
  | { type: 'remove'; index: number }
  | { type: 'insert'; index: number; part: PickedPart };

export const partsReducer = (state: PickedPart[], action: PartsAction): PickedPart[] => {
  switch (action.type) {
    case 'reset':
      return action.parts;
    case 'add':
      return mergeParts(state, action.parts);
    case 'setQty':
      return state.map((p, i) => (i === action.index ? { ...p, quantidade: action.quantidade } : p));
    case 'remove':
      return state.filter((_, i) => i !== action.index);
    case 'insert': {
      const next = [...state];
      next.splice(Math.min(action.index, next.length), 0, action.part);
      return next;
    }
  }
};

interface OsPartsSectionProps {
  parts: PickedPart[];
  dispatch: React.Dispatch<PartsAction>;
  subtitle: string;
  hasError?: boolean;
}

/** Seção "Peças utilizadas" do formulário no celular. */
const OsPartsSection: React.FC<OsPartsSectionProps> = ({ parts, dispatch, subtitle, hasError }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removed, setRemoved] = useState<{ index: number; part: PickedPart } | null>(null);

  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(t);
  }, [removed]);

  return (
    <section className="space-y-3" data-testid="os-parts-section">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Peças utilizadas{parts.length > 0 && ` (${parts.length})`}
      </h3>

      {parts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
          <Wrench className="h-5 w-5 opacity-40 shrink-0" />
          Nenhuma peça. Toque em Adicionar peças.
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {parts.map((p, i) => {
            const label = p.codigo_peca || p.descricao;
            return (
              <div key={`${partKey(p)}-${i}`} className="flex items-center gap-2 pl-3 pr-1 py-2" data-testid="os-form-part">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-blue-600 truncate">{p.codigo_peca || 'S/ Cód'}</div>
                  <div className="text-xs text-muted-foreground uppercase line-clamp-2">{p.descricao || 'S/ Desc'}</div>
                </div>
                <QuantityStepper
                  size="sm"
                  min={1}
                  value={p.quantidade || ''}
                  onChange={(v) => dispatch({ type: 'setQty', index: i, quantidade: v === '' ? 0 : v })}
                  error={hasError && !(p.quantidade > 0)}
                  label={label}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 text-destructive"
                  aria-label={`Remover ${label}`}
                  onClick={() => {
                    dispatch({ type: 'remove', index: i });
                    setRemoved({ index: i, part: p });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {removed && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg bg-foreground text-background pl-4 pr-1 py-1 text-sm animate-in fade-in duration-150"
          data-testid="part-removed-notice"
        >
          Peça removida
          <Button
            type="button"
            variant="ghost"
            className="h-10 text-amber-300 hover:text-amber-200 hover:bg-transparent font-semibold"
            onClick={() => {
              dispatch({ type: 'insert', index: removed.index, part: removed.part });
              setRemoved(null);
            }}
          >
            Desfazer
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full h-12 text-base text-primary border-primary/30"
        onClick={() => setPickerOpen(true)}
      >
        <PlusCircle className="h-5 w-5 mr-2" /> Adicionar peças
      </Button>

      {pickerOpen && (
        <Suspense fallback={null}>
          <PartPickerSheet
            open
            onOpenChange={setPickerOpen}
            subtitle={subtitle}
            onConfirm={(added) => dispatch({ type: 'add', parts: added })}
          />
        </Suspense>
      )}
    </section>
  );
};

export default React.memo(OsPartsSection);
