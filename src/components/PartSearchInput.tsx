import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part, getFrequentPartsForProfession } from '@/services/partListService';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';

interface PartSearchInputProps {
  onSearch: (query: string) => void;
  searchResults: Part[];
  onSelectPart: (part: Part) => void;
  searchQuery: string;
  isLoading: boolean;
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSearch, searchResults, onSelectPart, searchQuery, isLoading }) => {
  const { profile } = useSession();
  const { company } = useCompany();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [frequentParts, setFrequentParts] = useState<Part[]>([]);
  const [isLoadingFrequent, setIsLoadingFrequent] = useState(false);

  // Fetch frequent parts for the user's profession
  useEffect(() => {
    const fetchFrequent = async () => {
      if (profile?.profession_code && company) {
        setIsLoadingFrequent(true);
        try {
          const parts = await getFrequentPartsForProfession(profile.profession_code, company);
          setFrequentParts(parts);
        } catch (e) {
          console.error("Error loading frequent parts for search suggestions:", e);
        } finally {
          setIsLoadingFrequent(false);
        }
      }
    };
    fetchFrequent();
  }, [profile?.profession_code, company]);

  // Effect para fechar o dropdown quando clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputFocus = () => {
    setIsFocused(true);
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
        setIsDropdownOpen(false);
      }
    }, 120);
  };

  const handleSelectAndClose = (part: Part) => {
    onSelectPart(part);
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Combine search results with frequent parts, placing matching frequent parts first
  const displayedResults = useMemo(() => {
    if (searchQuery.length === 0) {
      return frequentParts;
    }
    
    const queryLower = searchQuery.toLowerCase().trim();
    
    // Filter frequent parts matching the query
    const matchingFrequent = frequentParts.filter(part => {
      return part.codigo.toLowerCase().includes(queryLower) || 
             (part.descricao && part.descricao.toLowerCase().includes(queryLower)) ||
             (part.name && part.name.toLowerCase().includes(queryLower));
    });
    
    // Merge matching frequent parts with the searchResults from parent
    const merged = [...matchingFrequent];
    
    searchResults.forEach(part => {
      if (!merged.some(m => m.codigo.toLowerCase() === part.codigo.toLowerCase())) {
        merged.push(part);
      }
    });
    
    return merged;
  }, [searchQuery, searchResults, frequentParts]);

  const shouldShowDropdown = isDropdownOpen && (searchQuery.length > 0 || frequentParts.length > 0);

  return (
    <div className="relative flex w-full items-center space-x-2" ref={containerRef}>
      <div className="relative flex-grow">
        <Label htmlFor="part-search" className="sr-only">Buscar Peça</Label>
        <Input
          id="part-search"
          type="text"
          placeholder="Buscar peça por código ou descrição..."
          value={searchQuery}
          onChange={(e) => {
            onSearch(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full"
          ref={inputRef}
          autoComplete="off"
        />
        {shouldShowDropdown && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-96 overflow-y-auto">
            {searchQuery.length === 0 && frequentParts.length > 0 && (
              <li className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-b flex items-center gap-1.5">
                <span>⭐</span> SUGESTÕES PARA SUA PROFISSÃO
              </li>
            )}
            {isLoading && searchQuery.length > 0 ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando peças...
              </li>
            ) : displayedResults.length > 0 ? (
              displayedResults.map((part) => {
                const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
                const subText = part.name && part.name.trim() !== '' ? part.descricao : '';
                const isFrequent = frequentParts.some(fp => fp.codigo.toLowerCase() === part.codigo.toLowerCase());

                return (
                  <li
                    key={part.id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-0 border-muted/30"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectAndClose(part)}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {part.codigo}
                        </span>
                        {isFrequent && (
                          <span className="text-amber-500 font-bold text-sm" title="Peça recomendada para sua profissão">
                            ★
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-foreground mt-0.5">{mainText}</span>
                      {subText && subText.trim() !== '' && (
                        <span className="text-[10px] italic text-muted-foreground mt-0.5">
                          {subText}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })
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