"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part, getParts, searchParts } from '@/services'; // Import searchParts from services
import { useQuery } from '@tanstack/react-query';

interface PartSearchInputProps {
  onSelectPart: (part: Part) => void;
  selectedPart?: Part | null; // Optional prop to show the currently selected part
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSelectPart, selectedPart }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Internal search query for CommandInput
  const [displayedSearchResults, setDisplayedSearchResults] = useState<Part[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null); // Ref for CommandInput

  // Fetch all parts for initial display when search is empty
  const { data: allParts = [], isLoading: isLoadingAllParts } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: getParts,
    initialData: [],
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData || [],
  });

  // Effect to synchronize searchQuery with selectedPart prop
  useEffect(() => {
    if (selectedPart) {
      setSearchQuery(selectedPart.codigo);
    } else {
      setSearchQuery('');
    }
  }, [selectedPart]);

  // Debounced search effect for Supabase
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length > 0) {
        setIsSearching(true);
        try {
          const results = await searchParts(searchQuery); // Call Supabase search
          setDisplayedSearchResults(results);
        } catch (error) {
          console.error("Error during part search:", error);
          setDisplayedSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setDisplayedSearchResults(allParts); // Show all parts when search is empty
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, allParts]); // Depend on allParts to re-display if the full list changes

  // Focus the CommandInput when the popover opens
  useEffect(() => {
    if (open) {
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
            placeholder="Buscar peça pelo código..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoadingAllParts || isSearching ? (
              <CommandEmpty className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> {isLoadingAllParts ? 'Carregando todas as peças...' : 'Buscando resultados...'}
              </CommandEmpty>
            ) : displayedSearchResults.length === 0 && searchQuery.length > 0 ? (
              <CommandEmpty>Nenhuma peça encontrada para "{searchQuery}".</CommandEmpty>
            ) : displayedSearchResults.length === 0 && searchQuery.length === 0 ? (
              <CommandEmpty>Nenhuma peça disponível no sistema.</CommandEmpty>
            ) : (
              <CommandGroup>
                {displayedSearchResults.map((part) => (
                  <CommandItem
                    key={part.id}
                    value={`${part.codigo} ${part.descricao}`} // Value for CommandItem search (simplified for display)
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