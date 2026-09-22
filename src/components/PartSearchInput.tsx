import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part, getFrequentPartsForProfession, getFavoriteParts, addFavoritePart, removeFavoritePart } from '@/services/partListService';
import { Loader2, Star } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';

interface PartSearchInputProps {
  onSearch: (query: string) => void;
  searchResults: Part[];
  onSelectPart: (part: Part) => void;
  searchQuery: string;
  isLoading: boolean;
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSearch, searchResults, onSelectPart, searchQuery, isLoading }) => {
  const { profile, user } = useSession();
  const { company } = useCompany();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [frequentParts, setFrequentParts] = useState<Part[]>([]);
  const [favoriteParts, setFavoriteParts] = useState<Part[]>([]);
  const [isLoadingFrequent, setIsLoadingFrequent] = useState(false);

  // Fetch frequent parts for the user's profession
  useEffect(() => {
    const fetchFrequent = async () => {
      // Respect user preference. If disabled, do not show suggestions
      if (profile?.suggest_parts === false) {
        setFrequentParts([]);
        return;
      }

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
  }, [profile?.profession_code, profile?.suggest_parts, company]);

  // Fetch favorite parts
  const fetchFavorites = async () => {
    try {
      const favs = await getFavoriteParts(user?.id, company);
      setFavoriteParts(favs);
    } catch (e) {
      console.error("Error loading favorite parts:", e);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user?.id, company]);

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
    }, 150);
  };

  const handleSelectAndClose = (part: Part) => {
    onSelectPart(part);
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, part: Part) => {
    e.stopPropagation();
    e.preventDefault();
    const isFav = favoriteParts.some(fp => fp.codigo.toLowerCase() === part.codigo.toLowerCase());
    if (isFav) {
      await removeFavoritePart(user?.id, company, part.codigo);
      setFavoriteParts(prev => prev.filter(p => p.codigo.toLowerCase() !== part.codigo.toLowerCase()));
    } else {
      await addFavoritePart(user?.id, company, part.codigo);
      setFavoriteParts(prev => [...prev, part]);
    }
  };

  // Combine search results, placing favorites first, matching frequent parts second, and other results last
  const displayedResults = useMemo(() => {
    if (searchQuery.length === 0) {
      const list: any[] = [];
      if (favoriteParts.length > 0) {
        favoriteParts.forEach(p => list.push({ ...p, itemType: 'favorite' }));
      }
      if (frequentParts.length > 0) {
        frequentParts.forEach(p => {
          if (!favoriteParts.some(fp => fp.codigo.toLowerCase() === p.codigo.toLowerCase())) {
            list.push({ ...p, itemType: 'frequent' });
          }
        });
      }
      return list;
    }
    
    const queryLower = searchQuery.toLowerCase().trim();
    
    // 1. Filter matching favorites
    const matchingFavorites = favoriteParts.filter(part => {
      return part.codigo.toLowerCase().includes(queryLower) || 
             (part.descricao && part.descricao.toLowerCase().includes(queryLower)) ||
             (part.name && part.name.toLowerCase().includes(queryLower));
    }).map(p => ({ ...p, itemType: 'favorite' }));
    
    // 2. Filter matching frequent parts
    const matchingFrequent = frequentParts.filter(part => {
      return part.codigo.toLowerCase().includes(queryLower) || 
             (part.descricao && part.descricao.toLowerCase().includes(queryLower)) ||
             (part.name && part.name.toLowerCase().includes(queryLower));
    }).filter(p => !matchingFavorites.some(mf => mf.codigo.toLowerCase() === p.codigo.toLowerCase()))
      .map(p => ({ ...p, itemType: 'frequent' }));
    
    // 3. Normal search results
    const normalResults: any[] = [];
    searchResults.forEach(part => {
      const isFav = matchingFavorites.some(mf => mf.codigo.toLowerCase() === part.codigo.toLowerCase());
      const isFreq = matchingFrequent.some(mf => mf.codigo.toLowerCase() === part.codigo.toLowerCase());
      if (!isFav && !isFreq) {
        normalResults.push({ ...part, itemType: 'normal' });
      }
    });
    
    return [...matchingFavorites, ...matchingFrequent, ...normalResults];
  }, [searchQuery, searchResults, frequentParts, favoriteParts]);

  const shouldShowDropdown = isDropdownOpen && (searchQuery.length > 0 || frequentParts.length > 0 || favoriteParts.length > 0);

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
            {isLoading && searchQuery.length > 0 ? (
              <li className="px-4 py-2 text-gray-500 dark:text-gray-400 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando peças...
              </li>
            ) : displayedResults.length > 0 ? (
              <>
                {displayedResults.map((part, index) => {
                  const mainText = part.name && part.name.trim() !== '' ? part.name : part.descricao;
                  const subText = part.name && part.name.trim() !== '' ? part.descricao : '';
                  
                  const isFav = favoriteParts.some(fp => fp.codigo.toLowerCase() === part.codigo.toLowerCase());
                  const isFreq = frequentParts.some(fp => fp.codigo.toLowerCase() === part.codigo.toLowerCase());

                  const showFavoriteHeader = searchQuery.length === 0 && index === 0 && part.itemType === 'favorite';
                  const showFrequentHeader = searchQuery.length === 0 && 
                    (part.itemType === 'frequent' && (index === 0 || displayedResults[index - 1].itemType === 'favorite'));

                  return (
                    <React.Fragment key={part.id || `disp-${index}`}>
                      {showFavoriteHeader && (
                        <li className="px-4 py-2 text-xs font-bold text-amber-600 bg-amber-500/5 border-b flex items-center gap-1.5 sticky top-0 z-10">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> MEUS FAVORITOS
                        </li>
                      )}
                      {showFrequentHeader && (
                        <li className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-b flex items-center gap-1.5 sticky top-0 z-10">
                          <span>⭐</span> SUGESTÕES PARA SUA PROFISSÃO
                        </li>
                      )}
                      <li
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-0 border-muted/30 flex items-center justify-between group/item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectAndClose(part)}
                      >
                        <div className="flex flex-col flex-grow pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {part.codigo}
                            </span>
                            {isFreq && (
                              <span className="text-blue-500 font-bold text-xs animate-pulse" title="Peça recomendada para sua profissão">
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
                        
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => handleToggleFavorite(e, part)}
                          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                          title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        >
                          <Star 
                            className={cn(
                              "h-4 w-4 transition-all duration-200", 
                              isFav ? "fill-amber-500 text-amber-500 scale-110" : "text-gray-300 dark:text-gray-600 hover:text-amber-400"
                            )} 
                          />
                        </button>
                      </li>
                    </React.Fragment>
                  );
                })}
              </>
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