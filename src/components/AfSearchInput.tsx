import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AfSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  availableAfs: string[];
  onSelectAf: (af: string) => void;
  readOnly?: boolean; // Adicionando a prop readOnly
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, availableAfs, onSelectAf, readOnly }) => {
  const [filteredAfs, setFilteredAfs] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (value.length > 0) {
      setFilteredAfs(
        availableAfs.filter((af) =>
          af.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredAfs(availableAfs);
    }
  }, [value, availableAfs]);

  const handleSelectAndClose = (af: string) => {
    onSelectAf(af);
    setIsInputFocused(false);
  };

  const shouldShowDropdown = isInputFocused && (value.length > 0 ? filteredAfs.length > 0 : true);

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow">
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <Input
          id="af-input"
          type="text"
          placeholder="Ex: AF12345"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsInputFocused(false), 100);
          }}
          className="w-full"
          required
          readOnly={readOnly} // Aplicando a prop readOnly aqui
        />
        {shouldShowDropdown && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {filteredAfs.length === 0 && value.length > 0 ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum AF encontrado.</li>
            ) : (
              filteredAfs.map((af) => (
                <li
                  key={af}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectAndClose(af)}
                >
                  {af}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AfSearchInput;