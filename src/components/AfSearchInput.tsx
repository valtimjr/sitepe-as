import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Af } from '@/services/partListService'; // Importar o tipo Af

interface AfSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  availableAfs: Af[]; // Alterado para receber objetos Af
  onSelectAf: (af: string) => void; // Ainda retorna apenas o af_number
  readOnly?: boolean;
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, availableAfs, onSelectAf, readOnly }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [displayedAfs, setDisplayedAfs] = useState<Af[]>(availableAfs);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atualiza displayedAfs quando availableAfs muda
  useEffect(() => {
    setDisplayedAfs(availableAfs);
  }, [availableAfs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue); // Atualiza o estado pai

    // Filtra os AFs exibidos com base no novo valor do input (busca em número ou descrição)
    setDisplayedAfs(
      availableAfs.filter((afItem) => {
        const lowerNewValue = newValue.toLowerCase();
        return afItem.af_number.toLowerCase().includes(lowerNewValue) ||
               (afItem.descricao && afItem.descricao.toLowerCase().includes(lowerNewValue));
      })
    );
    setIsDropdownOpen(true); // Garante que o dropdown esteja aberto ao digitar
  };

  const handleInputFocus = () => {
    if (readOnly) return;
    setIsDropdownOpen(true);
    // Ao focar, mostra todos os AFs disponíveis
    setDisplayedAfs(availableAfs);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsDropdownOpen(false);
    }, 150);
  };

  const handleSelectAndClose = (afItem: Af) => {
    onSelectAf(afItem.af_number); // Retorna apenas o número do AF
    onChange(afItem.af_number); // Atualiza o input para mostrar apenas o número do AF selecionado
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const getDisplayValue = (afItem: Af) => {
    if (afItem.descricao && afItem.descricao.trim().length > 0) {
      return `${afItem.af_number} - ${afItem.descricao}`;
    }
    return afItem.af_number;
  };

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow">
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <Input
          id="af-input"
          type="text"
          placeholder="Buscar AF por número ou descrição..."
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
                  key={afItem.id} // Usar o ID como chave
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectAndClose(afItem)}
                >
                  {getDisplayValue(afItem)}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum AF disponível.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AfSearchInput;