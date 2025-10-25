import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Af } from '@/services/partListService'; // Importar o tipo Af

interface AfSearchInputProps {
  value: string; // O número do AF (af_number)
  onChange: (value: string) => void; // Chamado com o que o usuário digita (para busca)
  availableAfs: Af[]; // Lista completa de AFs
  onSelectAf: (af: string) => void; // Chamado com o af_number do item selecionado
  readOnly?: boolean;
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, availableAfs, onSelectAf, readOnly }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [displayedAfs, setDisplayedAfs] = useState<Af[]>(availableAfs);
  const [displayValue, setDisplayValue] = useState(value); // Valor exibido no input
  const inputRef = useRef<HTMLInputElement>(null);

  // Função auxiliar para formatar AF + Descrição
  const getDisplayValue = (afItem: Af) => {
    if (afItem.descricao && afItem.descricao.trim().length > 0) {
      return `${afItem.af_number} - ${afItem.descricao}`;
    }
    return afItem.af_number;
  };

  // 1. Atualiza displayedAfs quando availableAfs muda
  useEffect(() => {
    setDisplayedAfs(availableAfs);
  }, [availableAfs]);

  // 2. Sincroniza o displayValue quando o 'value' (af_number) muda no componente pai
  // E encontra a descrição correspondente para exibição.
  useEffect(() => {
    if (value) {
      const selected = availableAfs.find(afItem => afItem.af_number === value);
      if (selected) {
        setDisplayValue(getDisplayValue(selected));
      } else {
        // Se o AF number não for encontrado na lista (ex: digitado manualmente ou AF antigo), exibe o número puro
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value, availableAfs]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue); // Atualiza o que o usuário vê

    // Notifica o pai com o valor digitado (para fins de busca, se necessário)
    onChange(newValue); 

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
      
      // Se o usuário desfocar e o valor digitado não for um AF válido,
      // reverte para o último AF válido selecionado (que está em `value`)
      // ou limpa se `value` for vazio.
      if (value) {
        const selected = availableAfs.find(afItem => afItem.af_number === value);
        if (selected) {
          setDisplayValue(getDisplayValue(selected));
        } else {
          setDisplayValue(value);
        }
      } else {
        setDisplayValue('');
      }
      
    }, 150);
  };

  const handleSelectAndClose = (afItem: Af) => {
    // 1. Notifica o pai com APENAS o número do AF
    onSelectAf(afItem.af_number); 
    // 2. Atualiza o valor de exibição para AF + Descrição
    setDisplayValue(getDisplayValue(afItem));
    
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow">
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <Input
          id="af-input"
          type="text"
          placeholder="Buscar AF por número ou descrição..."
          value={displayValue} // Usa o valor de exibição
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