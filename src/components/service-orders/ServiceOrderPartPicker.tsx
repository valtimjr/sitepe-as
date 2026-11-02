import React, { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Search, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompany } from '@/context/CompanyContext';
import { useSession } from '@/components/SessionContextProvider';
import { cn } from '@/lib/utils';
import {
  searchParts,
  getFrequentPartsForProfession,
  Part,
  getFavoriteParts,
  addFavoritePart,
  removeFavoritePart,
} from '@/services/partListService';
import QuantityStepper from './QuantityStepper';

export interface PickedPart {
  codigo_peca: string;
  descricao: string;
  quantidade: number;
}

interface ServiceOrderPartPickerProps {
  onConfirm: (part: PickedPart) => void;
  onCancel: () => void;
  /** Modo de toque (gaveta no celular): lista sempre visível, linhas maiores e rodapé fixo. */
  large?: boolean;
}

type DisplayPart = Part & { itemType: 'favorite' | 'frequent' | 'normal' };

const sameCode = (a: Part, b: Part) => a.codigo.toLowerCase() === b.codigo.toLowerCase();

const matches = (part: Part, q: string) =>
  part.codigo.toLowerCase().includes(q) ||
  (!!part.descricao && part.descricao.toLowerCase().includes(q)) ||
  (!!part.name && part.name.toLowerCase().includes(q));

/** Busca de peça com favoritos, sugestões da profissão e resultados. */
const ServiceOrderPartPicker: React.FC<ServiceOrderPartPickerProps> = ({ onConfirm, onCancel, large = false }) => {
  const { company } = useCompany();
  const { profile, user } = useSession();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [quantityError, setQuantityError] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [frequentParts, setFrequentParts] = useState<Part[]>([]);
  const [favoriteParts, setFavoriteParts] = useState<Part[]>([]);

  useEffect(() => {
    const fetchFrequent = async () => {
      if (profile?.suggest_parts === false) {
        setFrequentParts([]);
        return;
      }
      if (profile?.profession_code && company) {
        try {
          setFrequentParts(await getFrequentPartsForProfession(profile.profession_code, company));
        } catch (e) {
          console.error('Error loading frequent parts for ServiceOrderPartPicker:', e);
        }
      }
    };
    fetchFrequent();
  }, [profile?.profession_code, profile?.suggest_parts, company]);

  useEffect(() => {
    getFavoriteParts(user?.id, company)
      .then(setFavoriteParts)
      .catch((e) => console.error('Error loading favorite parts for ServiceOrderPartPicker:', e));
  }, [user?.id, company]);

  useEffect(() => {
    if (!searchQuery.trim() || selectedPart) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchResults((await searchParts(searchQuery, company)) || []);
      } catch (error) {
        console.error('Error searching parts', error);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedPart, company]);

  const displayedResults = useMemo<DisplayPart[]>(() => {
    if (searchQuery.length === 0) {
      return [
        ...favoriteParts.map(p => ({ ...p, itemType: 'favorite' as const })),
        ...frequentParts
          .filter(p => !favoriteParts.some(fp => sameCode(fp, p)))
          .map(p => ({ ...p, itemType: 'frequent' as const })),
      ];
    }
    const q = searchQuery.toLowerCase().trim();
    const fav = favoriteParts.filter(p => matches(p, q)).map(p => ({ ...p, itemType: 'favorite' as const }));
    const freq = frequentParts
      .filter(p => matches(p, q) && !fav.some(f => sameCode(f, p)))
      .map(p => ({ ...p, itemType: 'frequent' as const }));
    const normal = searchResults
      .filter(p => !fav.some(f => sameCode(f, p)) && !freq.some(f => sameCode(f, p)))
      .map(p => ({ ...p, itemType: 'normal' as const }));
    return [...fav, ...freq, ...normal];
  }, [searchQuery, searchResults, frequentParts, favoriteParts]);

  const handleToggleFavorite = async (e: React.MouseEvent, part: Part) => {
    e.stopPropagation();
    e.preventDefault();
    const isFav = favoriteParts.some(fp => sameCode(fp, part));
    if (isFav) {
      await removeFavoritePart(user?.id, company, part.codigo);
      setFavoriteParts(prev => prev.filter(p => !sameCode(p, part)));
    } else {
      await addFavoritePart(user?.id, company, part.codigo);
      setFavoriteParts(prev => [...prev, part]);
    }
  };

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery(part.descricao);
    setManualDescription(part.descricao);
    setManualCode(part.codigo);
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const handleSearchChange = (value: string) => {
    if (selectedPart) {
      setSelectedPart(null);
      setManualCode('');
      setManualDescription(value);
    }
    setSearchQuery(value);
  };

  const handleConfirm = () => {
    if (!manualDescription) return;
    const qtyNum = quantity === '' ? 0 : Number(quantity);
    if (quantity === '' || isNaN(qtyNum) || qtyNum <= 0) {
      setQuantityError(true);
      return;
    }
    onConfirm({ codigo_peca: manualCode, descricao: manualDescription, quantidade: qtyNum });
  };

  const renderResults = () => {
    if (displayedResults.length === 0) {
      return (
        <div className={cn('px-3 text-sm text-muted-foreground', large ? 'py-6 text-center' : 'py-2')}>
          {searchQuery.length > 0 ? 'Nenhuma peça encontrada.' : 'Digite para buscar uma peça.'}
        </div>
      );
    }
    return displayedResults.map((part, index) => {
      const isFrequent = frequentParts.some(fp => sameCode(fp, part));
      const isFav = favoriteParts.some(fp => sameCode(fp, part));
      const showFavoriteHeader = searchQuery.length === 0 && index === 0 && part.itemType === 'favorite';
      const showFrequentHeader =
        searchQuery.length === 0 &&
        part.itemType === 'frequent' &&
        (index === 0 || displayedResults[index - 1].itemType === 'favorite');

      return (
        <React.Fragment key={part.id || `disp-${index}`}>
          {showFavoriteHeader && (
            <div className="px-3 py-2 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-b flex items-center gap-1.5 sticky top-0 z-10">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> MEUS FAVORITOS
            </div>
          )}
          {showFrequentHeader && (
            <div className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-b flex items-center gap-1.5 sticky top-0 z-10">
              <span>⭐</span> SUGESTÕES PARA SUA PROFISSÃO
            </div>
          )}
          <div
            role="button"
            tabIndex={0}
            data-testid="part-picker-result"
            className={cn(
              'px-3 text-sm hover:bg-muted active:bg-muted cursor-pointer border-b last:border-0 flex items-center justify-between',
              large ? 'min-h-12 py-1.5' : 'py-2',
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelectPart(part)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSelectPart(part);
            }}
          >
            <div className="flex flex-col flex-grow pr-2 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-bold text-blue-600">{part.codigo}</div>
                {isFrequent && (
                  <span className="text-blue-500 font-bold text-sm" title="Peça recomendada para sua profissão">★</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">{part.name || part.descricao}</div>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleToggleFavorite(e, part)}
              className={cn(
                'rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0 flex items-center justify-center',
                large ? 'h-11 w-11' : 'p-1',
              )}
              title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star
                className={cn(
                  'h-4 w-4 transition-all duration-200',
                  isFav ? 'fill-amber-500 text-amber-500 scale-110' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400',
                )}
              />
            </button>
          </div>
        </React.Fragment>
      );
    });
  };

  if (!large) {
    return (
      <div className="grid gap-3 relative">
        <div className="relative z-50">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
            className="pl-9"
            autoFocus
            autoComplete="off"
          />
          {isSearchFocused && !selectedPart && (searchQuery.length > 0 || frequentParts.length > 0 || favoriteParts.length > 0) && (
            <div className="absolute z-[60] w-full mt-1 bg-popover rounded-md border shadow-2xl max-h-60 overflow-y-auto">
              {renderResults()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-3 relative z-40 items-start">
          <Input
            placeholder="Código"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="font-mono text-sm"
          />
          <Input
            placeholder="Descrição"
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            className="text-sm"
          />
          <div className="flex flex-col gap-1 w-full md:w-20">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') setQuantity('');
                else {
                  const parsed = parseInt(val, 10);
                  setQuantity(isNaN(parsed) ? '' : parsed);
                }
                setQuantityError(false);
              }}
              className={cn('w-full text-center', quantityError && 'border-destructive focus-visible:ring-destructive')}
            />
            {quantityError && (
              <p className="text-[10px] text-destructive text-center mt-1">O valor tem que ser maior que "0"</p>
            )}
          </div>
          <Button onClick={handleConfirm} disabled={!manualDescription}>
            <Check className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>
    );
  }

  const showFields = !!selectedPart || manualMode;

  return (
    <div className="flex flex-col" data-testid="part-picker">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar peça..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-10 h-11 text-base"
          autoComplete="off"
          aria-label="Buscar peça"
        />
        {searchQuery && (
          <button
            type="button"
            className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground"
            aria-label="Limpar busca"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!showFields && (
        <>
          <div className="mt-3 rounded-md border overflow-hidden max-h-[45vh] overflow-y-auto overscroll-contain">
            {renderResults()}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 h-11 justify-start text-primary"
            onClick={() => {
              setManualMode(true);
              if (!manualDescription && searchQuery) setManualDescription(searchQuery);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" /> Digitar código e descrição à mão
          </Button>
        </>
      )}

      {showFields && (
        <div className="mt-4 space-y-4 animate-in fade-in duration-200">
          <div className="space-y-1.5">
            <Label htmlFor="picker-code">Código</Label>
            <Input
              id="picker-code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Código"
              className="h-11 text-base font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="picker-desc">Descrição</Label>
            <Input
              id="picker-desc"
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="Descrição"
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quantidade</Label>
            <QuantityStepper
              value={quantity}
              onChange={(v) => {
                setQuantity(v);
                setQuantityError(false);
              }}
              error={quantityError}
            />
            {quantityError && <p className="text-xs text-destructive">O valor tem que ser maior que "0"</p>}
          </div>
          <Button
            type="button"
            variant="link"
            className="px-0 h-auto"
            onClick={() => {
              setSelectedPart(null);
              setManualMode(false);
              setSearchQuery('');
            }}
          >
            Escolher outra peça
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 -mx-6 mt-4 flex gap-3 border-t bg-background px-6 py-3">
        <Button type="button" variant="outline" className="flex-1 h-11" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1 h-11" onClick={handleConfirm} disabled={!manualDescription}>
          <Check className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>
    </div>
  );
};

export default ServiceOrderPartPicker;
