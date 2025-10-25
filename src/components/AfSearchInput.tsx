import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AfSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  availableAfs: string[];
  onSelectAf: (af: string) => void;
  readOnly?: boolean;
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, availableAfs, onSelectAf, readOnly }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [displayedAfs, setDisplayedAfs] = useState<string[]>(availableAfs); // Inicializa com todos os AFs
  const inputRef = useRef<HTMLInputElement>(null);

  // Atualiza displayedAfs quando availableAfs muda (ex: carregamento inicial ou atualização)
  useEffect(() => {
    setDisplayedAfs(availableAfs);
  }, [availableAfs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue); // Atualiza o estado pai

    // Filtra os AFs exibidos com base no novo valor do input
    setDisplayedAfs(
      availableAfs.filter((af) =>
        af.toLowerCase().includes(newValue.toLowerCase())
      )
    );
    setIsDropdownOpen(true); // Garante que o dropdown esteja aberto ao digitar
  };

  const handleInputFocus = () => {
    if (readOnly) return; // Se for somente leitura, não faz nada ao focar
    setIsDropdownOpen(true);
    // Ao focar, sempre mostra todos os AFs disponíveis, independentemente do valor atual
    setDisplayedAfs(availableAfs);
  };

  const handleInputBlur = () => {
    // Atraso para permitir que os eventos de clique nos itens da lista sejam registrados
    setTimeout(() => {
      setIsDropdownOpen(false);
    }, 150);
  };

  const handleSelectAndClose = (af: string) => {
    onSelectAf(af); // Atualiza o estado pai com o AF selecionado
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur(); // Desfoca manualmente o input após a seleção
    }
  };

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow">
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
          // Removido o atributo 'required' para tornar o campo opcional
          readOnly={readOnly}
          ref={inputRef}
        />
        {isDropdownOpen && !readOnly && ( // Só mostra o dropdown se não for somente leitura
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {displayedAfs.length === 0 && value.length > 0 ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum AF encontrado.</li>
            ) : displayedAfs.length > 0 ? (
              displayedAfs.map((afItem) => (
                <li
                  key={afItem}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onMouseDown={(e) => e.preventDefault()} // Previne o onBlur de fechar antes do onClick
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
    </div>
  );
};

export default AfSearchInput;