import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AfSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  availableAfs: string[];
  onSelectAf: (af: string) => void;
  readOnly?: boolean;
  afDescription?: string; // Novo: Descrição do AF selecionado
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, availableAfs, onSelectAf, readOnly, afDescription }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [displayedAfs, setDisplayedAfs] = useState<string[]>(availableAfs);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atualiza displayedAfs quando availableAfs muda
  useEffect(() => {
    setDisplayedAfs(availableAfs);
  }, [availableAfs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Filtra os AFs exibidos com base no novo valor do input
    setDisplayedAfs(
      availableAfs.filter((af) =>
        af.toLowerCase().includes(newValue.toLowerCase())
      )
    );
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    if (readOnly) return;
    setIsDropdownOpen(true);
    setDisplayedAfs(availableAfs);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsDropdownOpen(false);
    }, 150);
  };

  const handleSelectAndClose = (af: string) => {
    onSelectAf(af);
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow max-w-[150px] sm:max-w-[200px]"> {/* Largura reduzida */}
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <Input
          id="af-input"
          type="text"
          placeholder="Ex: AF12345"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full"
          readOnly={readOnly}
          ref={inputRef}
        />
        {isDropdownOpen && !readOnly && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {displayedAfs.length === 0 && value.length > 0 ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum AF encontrado.</li>
            ) : displayedAfs.length > 0 ? (
              displayedAfs.map((afItem) => (
                <li
                  key={afItem}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectAndClose(afItem)}
                >
                  {afItem}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum AF disponível.</li>
            )}
          </ul>
        )}
      </div>
      
      {/* Novo: Exibição da Descrição do AF */}
      <div className={cn(
        "flex-1 text-sm text-muted-foreground truncate",
        !afDescription && "italic"
      )}>
        {afDescription || (value ? 'Buscando descrição...' : 'Descrição do AF (Opcional)')}
      </div>
    </div>
  );
};

export default AfSearchInput;