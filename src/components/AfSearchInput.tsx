import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Af } from '@/services'; // Importar o tipo Af

interface AfSearchInputProps {
  value: string; // O número do AF (af_number)
  onChange: (value: string) => void; // Chamado com o que o usuário digita (para busca)
  availableAfs: Af[]; // Lista completa de AFs
  onSelectAf: (af: string) => void; // Chamado com o af_number do item selecionado
  readOnly?: boolean;
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, availableAfs, onSelectAf, readOnly }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [displayedAfs, setDisplayedAfs] = useState<Af[]>(availableAfs);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Função auxiliar para formatar AF + Descrição
  const getDisplayValue = (afItem: Af) => {
    if (afItem.descricao && afItem.descricao.trim().length > 0) {
      return `${afItem.af_number} - ${afItem.descricao}`;
    }
    return afItem.af_number;
  };

  // Efeito 1: Sincroniza o displayValue quando o 'value' (af_number) muda no componente pai
  useEffect(() => {
    if (!isFocused) {
      const selected = availableAfs.find(afItem => afItem.af_number === value);
      if (selected) {
        setDisplayValue(getDisplayValue(selected));
      } else {
        setDisplayValue(value);
      }
    }
  }, [value, availableAfs, isFocused]);

  // Efeito 2: Filtra a lista de AFs com debounce (mantido para busca)
  useEffect(() => {
    if (!isFocused) {
      setDisplayedAfs(availableAfs);
      return;
    }

    const filterAfs = () => {
      const lowerNewValue = displayValue.toLowerCase();
      if (lowerNewValue.length === 0) {
        setDisplayedAfs(availableAfs);
        return;
      }

      setDisplayedAfs(
        availableAfs.filter((afItem) => {
          return afItem.af_number.toLowerCase().includes(lowerNewValue) ||
                 (afItem.descricao && afItem.descricao.toLowerCase().includes(lowerNewValue));
        })
      );
    };

    const handler = setTimeout(filterAfs, 150); // Debounce de 150ms
    return () => clearTimeout(handler);
  }, [displayValue, availableAfs, isFocused]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    onChange(newValue); 
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    if (readOnly) return;
    
    setIsFocused(true);
    
    // Ao focar, define o displayValue para o valor puro do AF (af_number)
    // e garante que a lista seja exibida (o useEffect 2 cuidará da filtragem)
    setDisplayValue(value); 
    setDisplayedAfs(availableAfs);
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    // Pequeno atraso para permitir que o clique no item do dropdown seja registrado
    setTimeout(() => {
      setIsFocused(false);
      setIsDropdownOpen(false);
      
      // Se o campo foi limpo manualmente, garantimos que o pai seja notificado
      if (displayValue === '' && value !== '') {
        onChange('');
      }
      
    }, 100); // Reduzido para 100ms
  };

  const handleSelectAndClose = (afItem: Af) => {
    onSelectAf(afItem.af_number); 
    setDisplayValue(getDisplayValue(afItem));
    
    // O blur será disparado logo em seguida, e o useEffect fará a sincronização final.
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="relative flex w-full items-center space-x-2" ref={containerRef}>
      <div className="relative flex-grow">
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <Input
          id="af-input"
          type="text"
          placeholder="Buscar AF por número ou descrição..."
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full"
          readOnly={readOnly}
          ref={inputRef}
        />
        {isDropdownOpen && !readOnly && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {displayedAfs.length === 0 && displayValue.length > 0 ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum AF encontrado.</li>
            ) : displayedAfs.length > 0 ? (
              displayedAfs.map((afItem) => (
                <li
                  key={afItem.id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  // Usamos onMouseDown para prevenir que o blur feche o dropdown antes do click
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