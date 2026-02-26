"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Af } from '@/services/partListService';
import { Loader2 } from 'lucide-react';

interface AfSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAf: (af: string) => void;
  readOnly?: boolean;
  availableAfs: Af[];
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, onSelectAf, readOnly, availableAfs }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Af[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Initialize displayValue with value prop
  const [displayValue, setDisplayValue] = useState(value || '');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mapeia AFs para busca rápida
  const afsMap = useMemo(() => {
    const map = new Map<string, Af>();
    availableAfs.forEach(af => {
      map.set(af.af_number, af);
    });
    return map;
  }, [availableAfs]);

  const getFullDisplayName = (afItem: Af) => {
    return afItem.descricao ? `${afItem.af_number} - ${afItem.descricao}` : afItem.af_number;
  };

  // Sync displayValue with value prop
  useEffect(() => {
    // We update the display value if:
    // 1. The input is NOT focused (external update or initial load)
    // 2. The input IS focused but currently empty, and we have a value coming in (fixes race conditions on mount/focus)
    const shouldUpdate = !isFocused || (isFocused && !displayValue && value);

    if (shouldUpdate) {
      if (value) {
        const matchingAf = afsMap.get(value);
        if (matchingAf) {
          setDisplayValue(getFullDisplayName(matchingAf));
        } else {
          // Keep the value as is if it's a custom AF or not found in the list yet
          setDisplayValue(value);
        }
      } else if (!isFocused) {
        // Only clear if not focused to avoid interrupting user clearing the input manually
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value, isFocused, afsMap, displayValue]);

  // Lógica de busca/filtro
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isDropdownOpen && displayValue.length > 0) {
        setIsSearching(true);
        const lowerCaseQuery = displayValue.toLowerCase();
        
        // Split to handle "NUMBER - DESC" format during search if user is editing
        const rawTerm = displayValue.split(' - ')[0].trim().toLowerCase();

        const results = availableAfs.filter(af => 
          af.af_number.toLowerCase().includes(rawTerm) ||
          (af.descricao && af.descricao.toLowerCase().includes(rawTerm))
        ).slice(0, 50);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [displayValue, isDropdownOpen, availableAfs]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    // Extrai apenas o número do AF se estiver no formato "NÚMERO - DESCRIÇÃO"
    const afPart = newValue.split(' - ')[0].trim();
    onChange(afPart);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    if (readOnly) return;
    setIsFocused(true);
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    // Delay hiding to allow click on dropdown items
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsFocused(false);
        setIsDropdownOpen(false);
        
        const typedValue = displayValue.split(' - ')[0].trim();
        const matchingAf = afsMap.get(typedValue);

        if (matchingAf) {
          // If match found, standardize format
          onSelectAf(matchingAf.af_number);
          setDisplayValue(getFullDisplayName(matchingAf));
        } else {
          // If not found in map, accept the typed value as custom AF
          if (typedValue) {
             onSelectAf(typedValue);
             setDisplayValue(typedValue);
          } else {
             onSelectAf('');
             setDisplayValue('');
          }
        }
      }
    }, 150);
  };

  const handleSelectAndClose = (afItem: Af) => {
    onSelectAf(afItem.af_number);
    setDisplayValue(getFullDisplayName(afItem));
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative flex w-full flex-col" ref={containerRef}>
      <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
      <div className="relative">
        <Input
          id="af-input"
          type="text"
          placeholder="Digite o número do AF..."
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full pr-8"
          readOnly={readOnly}
          ref={inputRef}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {isDropdownOpen && searchResults.length > 0 && (
        <ul className="absolute z-[100] w-full bg-popover text-popover-foreground border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full">
          {searchResults.map((afItem) => (
            <li
              key={afItem.id}
              className="px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm border-b last:border-b-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectAndClose(afItem)}
            >
              {getFullDisplayName(afItem)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AfSearchInput;