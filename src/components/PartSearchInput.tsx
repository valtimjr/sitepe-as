"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part, getParts } from '@/services'; // Removed searchPartsService import as we'll filter locally
import { useQuery } from '@tanstack/react-query';

interface PartSearchInputProps {
  onSelectPart: (part: Part) => void;
  selectedPart?: Part | null; // Optional prop to show the currently selected part
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSelectPart, selectedPart }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Internal search query for CommandInput
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const commandInputRef = useRef<HTMLInputElement>(null); // Ref for CommandInput

  // Fetch all parts using react-query
  const { data: allParts = [], isLoading: isLoadingAllParts } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: getParts,
    initialData: [],
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData || [],
  });

  // Effect to synchronize searchQuery with selectedPart and filter locally
  useEffect(() => {
    if (selectedPart) {
      setSearchQuery(selectedPart.codigo);
    } else {
      setSearchQuery('');
    }
  }, [selectedPart]);

  // Effect to filter parts based on searchQuery from allParts
  useEffect(() => {
    if (searchQuery.length > 0) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const results = allParts.filter(part =>
        part.codigo.toLowerCase().includes(lowerCaseQuery) ||
        part.descricao.toLowerCase().includes(lowerCaseQuery) ||
        (part.tags && part.tags.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredParts(results);
    } else {
      setFilteredParts(allParts); // Show all parts when search is empty
    }
  }, [searchQuery, allParts]);

  // Focus the CommandInput when the popover opens
  useEffect(() => {
    if (open) {
      // Use a timeout to ensure the CommandInput is rendered before trying to focus
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 50); 
    }
  }, [open]);

  const handleSelect = (part: Part) => {
    setSearchQuery(part.codigo); // Update search query to show selected part's code
    onSelectPart(part);
    setOpen(false);
  };

  const getPartDisplay = (part: Part) => {
    return `${part.codigo} - ${part.descricao}`;
  };

  // Determine the text to display on the PopoverTrigger button
  const triggerButtonText = selectedPart 
    ? getPartDisplay(selectedPart)
    : (searchQuery.length > 0 && filteredParts.length === 1 && filteredParts[0].codigo === searchQuery)
      ? getPartDisplay(filteredParts[0]) // If only one result matches exactly, display it
      : "Selecionar peça...";

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
          {isLoadingAllParts ? "Carregando peças..." : triggerButtonText}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            ref={commandInputRef} // Attach ref here
            placeholder="Buscar peça..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoadingAllParts ? (
              <CommandEmpty className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando peças...
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
                    value={`${part.codigo} ${part.descricao} ${part.tags}`} // Value for CommandItem search
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