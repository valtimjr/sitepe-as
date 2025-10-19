import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part } from '@/services/partListService';

interface PartSearchInputProps {
  onSearch: (query: string) => void;
  searchResults: Part[];
  onSelectPart: (part: Part | null) => void; // Permitir null para desmarcar
  searchQuery: string;
  allParts: Part[];
  isLoading: boolean;
  selectedPart: Part | null; // Adicionar prop para a peça selecionada
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSearch, searchResults, onSelectPart, searchQuery, allParts, isLoading, selectedPart }) => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determina o valor a ser exibido no input
  const inputValue = selectedPart && searchQuery === ''
    ? `${selectedPart.codigo} - ${selectedPart.descricao}`
    : searchQuery;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    // Se uma peça estava selecionada e o usuário começou a digitar algo diferente, desmarca a peça
    if (selectedPart && newQuery !== inputValue) {
      onSelectPart(null); // Sinaliza para o pai desmarcar a peça
    }
    onSearch(newQuery); // Sempre atualiza a query de busca
  };

  const handleSelectAndClose = (part: Part) => {
    onSelectPart(part); // Define a peça selecionada no pai
    onSearch(''); // Limpa a query de busca no pai
    setIsInputFocused(false); // Fecha o dropdown
    if (inputRef.current) {
      inputRef.current.blur(); // Desfoca o input para garantir que o dropdown feche
    }
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    // Ao focar, se houver uma peça selecionada e a query de busca estiver vazia,
    // garantimos que a query de busca seja limpa para que a lista completa apareça.
    if (selectedPart && searchQuery === '') {
      onSearch('');
    }
  };

  const handleInputBlur = () => {
    // Pequeno atraso para permitir o clique nos itens da lista antes de fechar
    setTimeout(() => {
      setIsInputFocused(false);
      // Se o input perder o foco e nenhuma peça estiver selecionada, e houver uma query de busca,
      // limpa a query para evitar mostrar resultados de busca inativos.
      if (!selectedPart && searchQuery !== '') {
        onSearch('');
      }
    }, 150);
  };

  // Determina qual lista exibir: searchResults se houver query, allParts se focado e vazio
  const displayList = searchQuery.length > 0 ? searchResults : allParts;

  // A lista de sugestões deve aparecer se o input estiver focado E (houver texto OU a lista completa for exibida)
  const shouldShowDropdown = isInputFocused && (searchQuery.length > 0 || allParts.length > 0);

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow">
        <Label htmlFor="part-search" className="sr-only">Buscar Peça</Label>
        <Input
          id="part-search"
          type="text"
          placeholder="Buscar peça por código ou descrição..."
          value={inputValue} // Usa o valor calculado
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
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