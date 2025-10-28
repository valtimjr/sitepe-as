import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part } from '@/services/partListService';
import { cn } from '@/lib/utils';

interface PartSearchInputProps {
  onSearch: (query: string) => void;
  searchResults: Part[];
  onSelectPart: (part: Part) => void;
  searchQuery: string;
  allParts: Part[];
  isLoading: boolean;
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSearch, searchResults, onSelectPart, searchQuery, allParts, isLoading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Função auxiliar para formatar Part + Descrição
  const getDisplayValue = (partItem: Part) => {
    if (partItem.descricao && partItem.descricao.trim().length > 0) {
      return `${partItem.codigo} - ${partItem.descricao}`;
    }
    return partItem.codigo;
  };

  // Efeito 1: Sincroniza o displayValue quando o 'searchQuery' (que representa o item selecionado no pai) muda
  useEffect(() => {
    if (!isFocused) {
      // Se a query estiver vazia, limpa o display.
      if (searchQuery === '') {
        setDisplayValue('');
        return;
      }
      
      // Tenta encontrar a peça selecionada na lista de todas as peças para exibir o nome completo.
      const selected = allParts.find(partItem => partItem.codigo === searchQuery);
      if (selected) {
        setDisplayValue(getDisplayValue(selected));
      } else {
        // Se não for encontrado (ou se for apenas um código digitado), exibe a query.
        setDisplayValue(searchQuery);
      }
    }
  }, [searchQuery, allParts, isFocused]);

  // Effect para fechar o dropdown quando clicar fora do componente
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    onSearch(newValue); // Notifica o pai para iniciar a busca (debounce)
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    
    // Ao focar, se houver um item selecionado (searchQuery não vazio), 
    // definimos o displayValue para a query pura para facilitar a edição/busca.
    if (searchQuery.length > 0) {
      setDisplayValue(searchQuery);
    }
    
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setIsDropdownOpen(false);
      
      // Se o campo foi limpo manualmente, garantimos que o pai seja notificado
      if (displayValue === '' && searchQuery !== '') {
        onSearch('');
      }
      
      // Se o usuário digitou algo mas não selecionou, e o texto não corresponde a um item,
      // limpamos a busca para evitar que o texto digitado permaneça como "selecionado"
      if (displayValue !== '' && !allParts.some(p => p.codigo === displayValue || p.descricao === displayValue)) {
        onSearch(displayValue); // Mantém a busca ativa se o usuário parou de digitar
      }

    }, 100);
  };

  const handleSelectAndClose = (part: Part) => {
    onSelectPart(part);
    onSearch(part.codigo); // Define a query como o código da peça selecionada
    setDisplayValue(getDisplayValue(part));
    
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Determina qual lista exibir: searchResults se houver query, allParts se focado e vazio
  const displayList = searchQuery.length > 0 ? searchResults : allParts;

  // A lista de sugestões deve aparecer se o dropdown estiver aberto.
  const shouldShowDropdown = isDropdownOpen;

  return (
    <div className="relative flex w-full items-center space-x-2" ref={containerRef}>
      <div className="relative flex-grow">
        <Label htmlFor="part-search" className="sr-only">Buscar Peça</Label>
        <Input
          id="part-search"
          type="text"
          placeholder="Buscar peça por código ou descrição..."
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full"
          ref={inputRef}
        />
        {shouldShowDropdown && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-96 overflow-y-auto">
            {isLoading && displayValue.length > 0 ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Buscando peças...</li>
            ) : displayList.length > 0 ? (
              displayList.map((part) => (
                <li
                  key={part.id}
                  className={cn(
                    "px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                    part.codigo === searchQuery && 'bg-accent/50 dark:bg-accent/30'
                  )}
                  onMouseDown={(e) => e.preventDefault()} 
                  onClick={() => handleSelectAndClose(part)}
                >
                  {getDisplayValue(part)}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhuma peça encontrada.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PartSearchInput;