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
  const containerRef = useRef<HTMLDivElement>(null); // Ref para o container para detectar cliques fora

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

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    // Pequeno atraso para permitir que os eventos de clique nos itens da lista sejam registrados
    // O handleClickOutside já deve lidar com cliques fora, mas este é um fallback para o próprio input
    setTimeout(() => {
      // Verifica se o foco ainda está dentro do componente (ex: se o usuário clicou em um item da lista)
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsDropdownOpen(false);
      }
    }, 100);
  };

  const handleInputMouseDown = (e: React.MouseEvent) => {
    if (isDropdownOpen) {
      // Se o dropdown estiver aberto e o usuário clicar no input, previne a mudança de foco e o fecha
      e.preventDefault(); // Previne que o input ganhe foco, o que impediria o onFocus de disparar
      setIsDropdownOpen(false);
    } else {
      // Se o dropdown estiver fechado, permite o comportamento padrão (o onFocus irá abri-lo)
      // Não é necessário fazer nada aqui, o onFocus cuidará da abertura
    }
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
  const shouldShowDropdown = isDropdownOpen && (searchQuery.length > 0 || displayList.length > 0);

  return (
    <div className="relative flex w-full items-center space-x-2" ref={containerRef}>
      <div className="relative flex-grow">
        <Label htmlFor="part-search" className="sr-only">Buscar Peça</Label>
        <Input
          id="part-search"
          type="text"
          placeholder="Buscar peça por código ou descrição..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onMouseDown={handleInputMouseDown} // Usa onMouseDown para a lógica de toggle
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