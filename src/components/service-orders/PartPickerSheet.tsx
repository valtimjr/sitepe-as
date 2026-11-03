import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Search, Star, X } from 'lucide-react';
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import QuantityStepper from './QuantityStepper';
import PartResultRow from './PartResultRow';
import PartSelectionTray from './PartSelectionTray';
import { usePartSearch, type DisplayPart, type PartItemType } from './usePartSearch';
import { partKey, type PickedPart } from './mergeParts';

export interface PartPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtitle?: string;
  /** Recebe a seleção; quem recebe soma as repetidas com `mergeParts`. */
  onConfirm: (parts: PickedPart[]) => void;
}

type SelectionItem = Omit<PickedPart, 'quantidade'> & { quantidade: number | '' };

const PAGE_SIZE = 40;

const SECTION_HEADERS: Record<PartItemType, React.ReactNode> = {
  favorite: (
    <div className="px-3 py-2 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-b flex items-center gap-1.5">
      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> MEUS FAVORITOS
    </div>
  ),
  frequent: (
    <div className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-b flex items-center gap-1.5">
      <span>⭐</span> SUGESTÕES DA PROFISSÃO
    </div>
  ),
  normal: (
    <div className="px-3 py-2 text-xs font-bold text-muted-foreground bg-muted/50 border-b">RESULTADOS DA BUSCA</div>
  ),
};

/** Gaveta para escolher várias peças de uma vez (celular). */
const PartPickerSheet: React.FC<PartPickerSheetProps> = ({ open, onOpenChange, subtitle, onConfirm }) => {
  const keyboardOpen = useKeyboardOpen();
  const { query, setQuery, results, isSearching, listsLoading, favoriteCodes, frequentCodes, toggleFavorite } =
    usePartSearch({ enabled: open });

  const [selection, setSelection] = useState<SelectionItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualQty, setManualQty] = useState<number | ''>(1);
  const [manualError, setManualError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query]);

  const addToSelection = useCallback((part: Omit<PickedPart, 'quantidade'>, qty: number) => {
    const key = partKey(part);
    setSelection((prev) => {
      const at = prev.findIndex((p) => partKey(p) === key);
      if (at === -1) return [...prev, { ...part, quantidade: qty }];
      const next = [...prev];
      const current = next[at].quantidade === '' ? 0 : (next[at].quantidade as number);
      next[at] = { ...next[at], quantidade: current + qty };
      return next;
    });
  }, []);

  const setQuantityByKey = useCallback((key: string, value: number | '') => {
    setSelection((prev) =>
      value !== '' && value <= 0
        ? prev.filter((p) => partKey(p) !== key)
        : prev.map((p) => (partKey(p) === key ? { ...p, quantidade: value } : p)),
    );
  }, []);

  const removeByKey = useCallback((key: string) => {
    setSelection((prev) => prev.filter((p) => partKey(p) !== key));
  }, []);

  const handleAddResult = useCallback(
    (part: DisplayPart) => {
      tap();
      addToSelection({ codigo_peca: part.codigo || '', descricao: part.descricao || part.name || '' }, 1);
    },
    [addToSelection],
  );

  const handleSetResultQuantity = useCallback(
    (part: DisplayPart, value: number | '') => {
      setQuantityByKey(partKey({ codigo_peca: part.codigo || '', descricao: part.descricao || part.name || '' }), value);
    },
    [setQuantityByKey],
  );

  const handleToggleFavorite = useCallback((part: DisplayPart) => {
    toggleFavorite(part);
  }, [toggleFavorite]);

  const selectedQty = useMemo(() => new Map(selection.map((p) => [partKey(p), p.quantidade])), [selection]);

  const confirmable = selection.filter((p) => p.quantidade !== '' && p.quantidade > 0);

  const requestClose = () => {
    if (selection.length > 0) setConfirmDiscard(true);
    else onOpenChange(false);
  };

  const handleConfirm = () => {
    if (confirmable.length === 0) return;
    onConfirm(confirmable.map((p) => ({ ...p, quantidade: p.quantidade as number })));
    onOpenChange(false);
  };

  const openManual = () => {
    setManualMode(true);
    setManualCode('');
    setManualDesc(query.trim());
    setManualQty(1);
    setManualError(null);
  };

  const handleManualAdd = () => {
    if (!manualCode.trim() && !manualDesc.trim()) {
      setManualError('Informe o código ou a descrição.');
      return;
    }
    if (manualQty === '' || manualQty <= 0) {
      setManualError('O valor da quantidade tem que ser maior que "0"');
      return;
    }
    tap();
    addToSelection({ codigo_peca: manualCode.trim(), descricao: manualDesc.trim() }, manualQty);
    setManualMode(false);
    setQuery('');
  };

  const visible = results.slice(0, visibleCount);
  const trimmed = query.trim();

  const renderList = () => {
    if (results.length === 0) {
      if (isSearching || (listsLoading && !trimmed)) {
        return (
          <div className="p-3 space-y-3" aria-label="Carregando peças">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {trimmed ? 'Nenhuma peça encontrada.' : 'Digite para buscar uma peça.'}
        </div>
      );
    }
    return (
      <>
        {visible.map((part, index) => {
          const showHeader = index === 0 || visible[index - 1].itemType !== part.itemType;
          const code = (part.codigo || '').toLowerCase();
          const qty = selectedQty.get(partKey({ codigo_peca: part.codigo || '', descricao: part.descricao || part.name || '' }));
          return (
            <React.Fragment key={part.id || `${part.itemType}-${part.codigo}-${index}`}>
              {showHeader && SECTION_HEADERS[part.itemType]}
              <PartResultRow
                part={part}
                quantity={qty ?? 0}
                isFavorite={favoriteCodes.has(code)}
                isFrequent={frequentCodes.has(code)}
                onAdd={handleAddResult}
                onSetQuantity={handleSetResultQuantity}
                onToggleFavorite={handleToggleFavorite}
              />
            </React.Fragment>
          );
        })}
        {results.length > visibleCount && (
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Mostrar mais ({results.length - visibleCount})
          </Button>
        )}
        {isSearching && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
      </>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
        <ResponsiveSheetContent
          fixedHeight
          className="w-full sm:max-w-lg"
          data-testid="add-part-sheet"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 border-b space-y-3 shrink-0">
            <SheetHeader className="text-left space-y-0.5 pr-8">
              <SheetTitle>Adicionar peças</SheetTitle>
              <SheetDescription>{subtitle || 'Escolha uma ou mais peças.'}</SheetDescription>
            </SheetHeader>
            {!manualMode && (
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  enterKeyHint="search"
                  placeholder="Buscar código ou nome"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 pr-11 h-11 text-base [&::-webkit-search-cancel-button]:hidden"
                  autoComplete="off"
                  aria-label="Buscar peça"
                />
                {query && (
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground"
                    aria-label="Limpar busca"
                    onClick={() => setQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {manualMode ? (
              <div className="p-5 space-y-4 animate-in fade-in duration-150" data-testid="part-manual-form">
                <div className="space-y-1.5">
                  <Label htmlFor="picker-code">Código</Label>
                  <Input
                    id="picker-code"
                    value={manualCode}
                    onChange={(e) => { setManualCode(e.target.value); setManualError(null); }}
                    placeholder="Código"
                    enterKeyHint="next"
                    autoComplete="off"
                    className="h-11 text-base font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="picker-desc">Descrição</Label>
                  <Input
                    id="picker-desc"
                    value={manualDesc}
                    onChange={(e) => { setManualDesc(e.target.value); setManualError(null); }}
                    placeholder="Descrição"
                    autoComplete="off"
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantidade</Label>
                  <QuantityStepper
                    value={manualQty}
                    onChange={(v) => { setManualQty(v); setManualError(null); }}
                    error={!!manualError && (manualQty === '' || manualQty <= 0)}
                  />
                </div>
                {manualError && <p className="text-sm text-destructive">{manualError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setManualMode(false)}>
                    Voltar à busca
                  </Button>
                  <Button type="button" className="h-11 flex-1" onClick={handleManualAdd}>
                    Adicionar à seleção
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {renderList()}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-12 justify-start px-4 text-primary border-t rounded-none"
                  onClick={openManual}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Não achou? Digitar à mão
                </Button>
              </>
            )}
          </div>

          <div className="shrink-0 border-t bg-background">
            {!keyboardOpen && (
              <PartSelectionTray items={selection} onSetQuantity={setQuantityByKey} onRemove={removeByKey} />
            )}
            <div
              className={cn(
                'flex gap-3 px-4 pt-3',
                keyboardOpen ? 'pb-3' : 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
              )}
            >
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={requestClose}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1 h-11" onClick={handleConfirm} disabled={confirmable.length === 0}>
                <Check className="h-4 w-4 mr-2" /> Concluir ({confirmable.length})
              </Button>
            </div>
          </div>
        </ResponsiveSheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Descartar {selection.length} {selection.length === 1 ? 'peça selecionada' : 'peças selecionadas'}?
            </AlertDialogTitle>
            <AlertDialogDescription>As peças escolhidas não serão adicionadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar escolhendo</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setSelection([]);
                onOpenChange(false);
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PartPickerSheet;
