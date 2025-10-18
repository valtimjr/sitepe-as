import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part } from '@/services/partListService';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

interface PartSearchInputProps {
  onSearch: (query: string) => void;
  searchResults: Part[];
  onSelectPart: (part: Part) => void;
  searchQuery: string;
  allParts: Part[];
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSearch, searchResults, onSelectPart, searchQuery, allParts }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectAndClose = (part: Part) => {
    onSelectPart(part);
    setIsPopoverOpen(false);
    onSearch(''); // Limpa a query de busca no componente pai
    if (inputRef.current) {
      inputRef.current.focus(); // Re-foca o input após a seleção
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onSearch(query); // Propaga a mudança para o componente pai para a lógica de busca
    if (query.length > 0 && !isPopoverOpen) {
      setIsPopoverOpen(true); // Abre o popover se a digitação começar e ele estiver fechado
    }
  };

  // Determina qual lista mostrar no popover: resultados da busca ou todas as peças
  const partsToShow = searchQuery.length > 0 ? searchResults : allParts;

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        {/* O gatilho será o campo de input e o botão de chevron combinados */}
        <div className="relative flex w-full items-center space-x-2">
          <Label htmlFor="part-search" className="sr-only">Buscar Peça</Label>
          <Input
            id="part-search"
            ref={inputRef}
            type="text"
            placeholder="Buscar peça por código ou descrição..."
            value={searchQuery}
            onChange={handleInputChange}
            className="w-full"
            // O PopoverTrigger já lida com a abertura no foco, mas podemos adicionar um onClick para garantir
            onClick={() => setIsPopoverOpen(true)}
          />
          <Button variant="outline" size="icon" aria-label="Mostrar todas as peças" onClick={() => setIsPopoverOpen(true)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0" // Ajusta a largura para corresponder ao gatilho
        side="bottom"
        align="start"
        alignOffset={0}
      >
        <div className="max-h-96 overflow-y-auto">
          {partsToShow.length === 0 ? (
            <p className="p-4 text-center text-gray-500">
              {searchQuery.length > 0 ? `Nenhuma peça encontrada para "${searchQuery}".` : 'Nenhuma peça disponível.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {partsToShow.map((part) => (
                <li
                  key={part.id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectAndClose(part)}
                >
                  {part.codigo} - {part.descricao}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PartSearchInput;