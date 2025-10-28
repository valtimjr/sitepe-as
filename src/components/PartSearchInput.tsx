"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part, getParts, searchParts as searchPartsService } from '@/services';
import { useQuery } from '@tanstack/react-query';

interface PartSearchInputProps {
  onSelectPart: (part: Part) => void;
  selectedPart?: Part | null; // Optional prop to show the currently selected part
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSelectPart, selectedPart }) => {
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(selectedPart?.codigo || ''); // Value shown in the trigger button
  const [searchQuery, setSearchQuery] = useState(''); // Internal search query for CommandInput
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all parts using react-query
  const { data: allParts = [], isLoading: isLoadingAllParts } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: getParts,
    initialData: [],
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData || [],
  });

  // Debounce search logic for CommandInput
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length > 0) {
        setIsSearching(true);
        try {
          const results = await searchPartsService(searchQuery);
          setFilteredParts(results);
        } finally {
          setIsSearching(false);
        }
      } else {
        setFilteredParts(allParts); // Show all parts when search is empty
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, allParts]);

  // Update internal displayValue when selectedPart prop changes
  useEffect(() => {
    if (selectedPart) {
      setDisplayValue(selectedPart.codigo);
      setSearchQuery(selectedPart.codigo); // Keep search input in sync with selected part
    } else {
      setDisplayValue('');
      setSearchQuery('');
    }
  }, [selectedPart]);

  const handleSelect = (part: Part) => {
    setDisplayValue(part.codigo);
    setSearchQuery(part.codigo); // Keep search input in sync
    onSelectPart(part);
    setOpen(false);
  };

  const getPartDisplay = (part: Part) => {
    return `${part.codigo} - ${part.descricao}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoadingAllParts}
        >
          {displayValue
            ? getPartDisplay(allParts.find((part) => part.codigo === displayValue) || { id: '', codigo: displayValue, descricao: 'Peça não encontrada' })
            : "Selecionar peça..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Buscar peça..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoadingAllParts || isSearching ? (
              <CommandEmpty className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> {isLoadingAllParts ? 'Carregando peças...' : 'Buscando resultados...'}
              </CommandEmpty>
            ) : filteredParts.length === 0 && searchQuery.length > 0 ? (
              <CommandEmpty>Nenhuma peça encontrada para "{searchQuery}".</CommandEmpty>
            ) : filteredParts.length === 0 && searchQuery.length === 0 ? (
              <CommandEmpty>Nenhuma peça disponível no sistema.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredParts.map((part) => (
                  <CommandItem
                    key={part.id}
                    value={`${part.codigo} ${part.descricao} ${part.tags}`}
                    onSelect={() => handleSelect(part)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedPart?.id === part.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getPartDisplay(part)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PartSearchInput;