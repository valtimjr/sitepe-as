import React, { useState } from 'react';
import { Check, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Part } from '@/services/partListService';
import { usePartSearch } from './usePartSearch';
import type { PickedPart } from './mergeParts';

interface ServiceOrderPartPickerProps {
  onConfirm: (part: PickedPart) => void;
  onCancel: () => void;
}

/** Busca de peça inline (desktop) com favoritos, sugestões da profissão e resultados. */
const ServiceOrderPartPicker: React.FC<ServiceOrderPartPickerProps> = ({ onConfirm }) => {
  const { query, setQuery, results, favoriteParts, frequentParts, isFavorite, toggleFavorite, frequentCodes } =
    usePartSearch();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [quantityError, setQuantityError] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualCode, setManualCode] = useState('');

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setQuery(part.descricao);
    setManualDescription(part.descricao);
    setManualCode(part.codigo);
    setIsSearchFocused(false);
  };

  const handleSearchChange = (value: string) => {
    if (selectedPart) {
      setSelectedPart(null);
      setManualCode('');
      setManualDescription(value);
    }
    setQuery(value);
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
    if (results.length === 0) {
      return (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          {query.length > 0 ? 'Nenhuma peça encontrada.' : 'Digite para buscar uma peça.'}
        </div>
      );
    }
    return results.map((part, index) => {
      const isFrequent = frequentCodes.has((part.codigo || '').toLowerCase());
      const isFav = isFavorite(part);
      const showFavoriteHeader = query.length === 0 && index === 0 && part.itemType === 'favorite';
      const showFrequentHeader =
        query.length === 0 &&
        part.itemType === 'frequent' &&
        (index === 0 || results[index - 1].itemType === 'favorite');

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
            className="px-3 py-2 text-sm hover:bg-muted active:bg-muted cursor-pointer border-b last:border-0 flex items-center justify-between"
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
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleFavorite(part);
              }}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0 flex items-center justify-center"
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

  return (
    <div className="grid gap-3 relative">
      <div className="relative z-50">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar peça..."
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
          className="pl-9"
          autoFocus
          autoComplete="off"
        />
        {isSearchFocused && !selectedPart && (query.length > 0 || frequentParts.length > 0 || favoriteParts.length > 0) && (
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
};

export default ServiceOrderPartPicker;
