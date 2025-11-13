"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  const [inputValue, setInputValue] = useState(''); // Internal state for the input field's value
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDisplayValue = (afItem: Af) => {
    return afItem.descricao ? `${afItem.af_number} - ${afItem.descricao}` : afItem.af_number;
  };

  // Effect to sync the internal input value from the parent's `value` prop (the AF number)
  useEffect(() => {
    if (!isFocused) { // Don't update while user is typing
      if (value && availableAfs.length > 0) {
        const matchingAf = availableAfs.find(af => af.af_number === value);
        if (matchingAf) {
          setInputValue(getDisplayValue(matchingAf));
        } else {
          setInputValue(value); // Fallback if not found (e.g., new AF)
        }
      } else {
        setInputValue(value || ''); // Handle empty/null value from parent
      }
    }
  }, [value, availableAfs, isFocused]);

  // Effect for searching based on what the user is typing
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isFocused && inputValue) {
        setIsSearching(true);
        const lowerCaseQuery = inputValue.toLowerCase();
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
  }, [inputValue, isFocused, availableAfs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Let parent know about typing, useful for creating new AFs
    setIsDropdownOpen(true);
  };

  const handleSelectAndClose = (afItem: Af) => {
    onSelectAf(afItem.af_number); // Inform parent of the selected AF NUMBER
    setInputValue(getDisplayValue(afItem)); // Update display
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleInputFocus = () => {
    if (readOnly) return;
    setIsFocused(true);
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsFocused(false);
        setIsDropdownOpen(false);
        // The useEffect will handle resetting the display value based on the parent's `value` prop.
      }
    }, 150);
  };

  // Effect to handle clicks outside the component to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative flex w-full items-center space-x-2" ref={containerRef}>
      <div className="relative flex-grow">
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <div className="relative">
          <Input
            id="af-input"
            type="text"
            placeholder="Buscar AF por número ou descrição..."
            value={inputValue}
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
          <ul className="absolute z-10 w-full bg-card border border-border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {searchResults.map((afItem) => (
              <li
                key={afItem.id}
                className="px-4 py-2 cursor-pointer hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
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