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
  const [isFocused, setIsFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Af[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Initialize displayValue with value prop to ensure it shows up in edit mode immediately
  const [displayValue, setDisplayValue] = useState(value || '');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const afsMap = useMemo(() => {
    const map = new Map<string, Af>();
    availableAfs.forEach(af => {
      map.set(af.af_number, af);
    });
    return map;
  }, [availableAfs]);

  const getDisplayValue = (afItem: Af) => {
    return afItem.descricao ? `${afItem.af_number} - ${afItem.descricao}` : afItem.af_number;
  };

  // Sync displayValue with value prop when not editing
  useEffect(() => {
    if (!isFocused) {
      if (value) {
        const matchingAf = afsMap.get(value);
        if (matchingAf) {
          setDisplayValue(getDisplayValue(matchingAf));
        } else {
          // Keep the value as is if it's a custom AF or not found in the list yet
          setDisplayValue(value);
        }
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused, afsMap]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (isFocused && displayValue.length > 0) {
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

    return () => {
      clearTimeout(handler);
    };
  }, [displayValue, isFocused, availableAfs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    onChange(newValue);
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
          setDisplayValue(getDisplayValue(matchingAf));
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
    setDisplayValue(getDisplayValue(afItem));
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="relative flex w-full items-center space-x-2" ref={containerRef}>
      <div className="relative flex-grow">
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <div className="relative">
          <Input
            id="af-input"
            type="text"
            placeholder="Buscar AF por número ou descrição..."
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
        {isDropdownOpen && !readOnly && searchResults.length > 0 && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {searchResults.map((afItem) => (
              <li
                key={afItem.id}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectAndClose(afItem)}
              >
                {getDisplayValue(afItem)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AfSearchInput;