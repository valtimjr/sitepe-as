import React, { useState, useRef, useEffect } from 'react';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | string>('auto');
  const [dynamicAlignOffset, setDynamicAlignOffset] = useState(0);

  // Efeito para calcular a largura do popover e o offset de alinhamento
  useEffect(() => {
    const calculatePosition = () => {
      if (inputRef.current && buttonRef.current) {
        setPopoverWidth(inputRef.current.offsetWidth);

        const inputRect = inputRef.current.getBoundingClientRect();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        // Calcula o offset para alinhar a borda esquerda do popover com a borda esquerda do input
        setDynamicAlignOffset(inputRect.left - buttonRect.left);
      }
    };

    // Calcula a posição ao abrir o popover e ao redimensionar a janela
    if (isPopoverOpen) {
      calculatePosition();
    }
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [isPopoverOpen]); // Recalcula quando o popover abre/fecha

  const handleSelectAndClose = (part: Part) => {
    onSelectPart(part);
    setIsPopoverOpen(false);
    onSearch('');
  };

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
          className="w-full"
          ref={inputRef} {/* Anexa a ref ao input */}
        />
        {searchQuery && searchResults.length > 0 && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-96 overflow-y-auto">
            {searchResults.map((part) => (
              <li
                key={part.codigo}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSelectAndClose(part)}
              >
                {part.codigo} - {part.descricao}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Mostrar todas as peças" ref={buttonRef}> {/* Anexa a ref ao botão */}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          style={{ width: popoverWidth }} // Aplica a largura dinâmica
          side="bottom"
          align="start" // Alinha a borda esquerda do popover com a borda esquerda do gatilho (botão)
          sideOffset={4} // Pequeno espaçamento abaixo do botão
          alignOffset={dynamicAlignOffset} // Aplica o offset calculado para alinhar com o input
        >
          <div className="max-h-96 overflow-y-auto">
            {allParts.length === 0 ? (
              <p className="p-4 text-center text-gray-500">Nenhuma peça disponível.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {allParts.map((part) => (
                  <li
                    key={part.codigo}
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
    </div>
  );
};

export default PartSearchInput;