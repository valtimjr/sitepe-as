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
  const [displayValue, setDisplayValue] = useState('');
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

  // Sincroniza o valor externo com o valor de exibição interno
  useEffect(() => {
    if (value) {
      const matchingAf = afsMap.get(value);
      if (matchingAf) {
        setDisplayValue(getFullDisplayName(matchingAf));
      } else {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value, afsMap]);

  // Lógica de busca/filtro
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isDropdownOpen && displayValue.length > 0) {
        setIsSearching(true);
        const lowerCaseQuery = displayValue.toLowerCase();
        const results = availableAfs.filter(af => 
          af.af_number.toLowerCase().includes(lowerCaseQuery) ||
          (af.descricao && af.descricao.toLowerCase().includes(lowerCaseQuery))
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
          onFocus={() => setIsDropdownOpen(true)}
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