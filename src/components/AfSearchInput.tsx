import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Af, searchAfs } from '@/services/partListService';
import { Loader2 } from 'lucide-react';

interface AfSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAf: (af: string) => void;
  readOnly?: boolean;
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, onSelectAf, readOnly }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Af[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDisplayValue = (afItem: Af) => {
    return afItem.descricao ? `${afItem.af_number} - ${afItem.descricao}` : afItem.af_number;
  };

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value);
    }
  }, [value, isFocused]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (isFocused && displayValue.length > 0) {
        setIsSearching(true);
        const results = await searchAfs(displayValue);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [displayValue, isFocused]);

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
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsFocused(false);
        setIsDropdownOpen(false);
        if (displayValue === '' && value !== '') {
          onChange('');
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
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {isDropdownOpen && !readOnly && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((afItem) => (
                <li
                  key={afItem.id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectAndClose(afItem)}
                >
                  {getDisplayValue(afItem)}
                </li>
              ))
            ) : (isFocused && displayValue.length > 0 && !isSearching) ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum AF encontrado.</li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AfSearchInput;