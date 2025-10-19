import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part } from '@/services/partListService';

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
  const ignoreNextFocus = useRef(false); // Flag para ignorar o próximo evento de foco

  const handleInputClick = () => {
    if (isDropdownOpen) {
      // Se o dropdown estiver aberto, feche-o e defina a flag para ignorar o próximo foco
      setIsDropdownOpen(false);
      ignoreNextFocus.current = true;
    } else {
      // Se estiver fechado, abra-o
      setIsDropdownOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (ignoreNextFocus.current) {
      // Se a flag estiver ativa, resete-a e ignore este evento de foco
      ignoreNextFocus.current = false;
      return;
    }
    // Caso contrário, garanta que o dropdown esteja aberto
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    // Pequeno atraso para permitir que os eventos de clique nos itens da lista sejam registrados
    setTimeout(() => {
      setIsDropdownOpen(false);
      ignoreNextFocus.current = false; // Reseta a flag no blur
    }, 100);
  };

  const handleSelectAndClose = (part: Part) => {
    onSelectPart(part);
    onSearch(''); // Limpa a query de busca após a seleção
    setIsDropdownOpen(false); // Fecha o dropdown imediatamente
    if (inputRef.current) {
      inputRef.current.blur(); // Desfoca manualmente o input para garantir que o onBlur seja acionado
    }
  };

  // Determina qual lista exibir: searchResults se houver query, allParts se focado e vazio
  const displayList = searchQuery.length > 0 ? searchResults : allParts;

  // A lista de sugestões deve aparecer se o dropdown estiver explicitamente aberto E houver itens para mostrar
  const shouldShowDropdown = isDropdownOpen && (searchQuery.length > 0 || allParts.length > 0);

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow">
        <Label htmlFor="part-search" className="sr-only">Buscar Peça</Label>
        <Input
          id="part-search"
          type="text"
          placeholder="Buscar peça por código ou descrição..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onClick={handleInputClick} // Adicionado: Manipulador de clique para toggle
          onFocus={handleInputFocus} // Manipulador de foco
          onBlur={handleInputBlur}   // Manipulador de blur
          className="w-full"
          ref={inputRef}
        />
        {shouldShowDropdown && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-96 overflow-y-auto">
            {isLoading && searchQuery.length > 0 ? ( // Mostra carregando apenas se houver query
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400">Buscando peças...</li>
            ) : displayList.length > 0 ? (
              displayList.map((part) => (
                <li
                  key={part.id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onMouseDown={(e) => e.preventDefault()} // Previne o onBlur de fechar antes do onClick
                  onClick={() => handleSelectAndClose(part)}
                >
                  {part.codigo} - {part.descricao}
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