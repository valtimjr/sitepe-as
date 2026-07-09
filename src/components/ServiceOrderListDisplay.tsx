"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceOrderData } from '@/types/supabase';
import { Clock, Pencil, Trash2, PlusCircle, Search, X, Check, GripVertical, Tag, Package, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/SessionContextProvider';
import { Checkbox } from '@/components/ui/checkbox';
import { searchParts, getFrequentPartsForProfession, Part, getFavoriteParts, addFavoritePart, removeFavoritePart } from '@/services/partListService';

interface ServiceOrderListDisplayProps {
  group: ServiceOrderData;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (updatedOs: ServiceOrderData) => void;
  onAddPart?: () => void;
  readOnly?: boolean;
  additionalHeader?: React.ReactNode;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
}

interface RelatedItem {
  code: string;
  description: string;
}

const ServiceOrderPartRow: React.FC<{
  part: { codigo_peca: string; descricao: string; quantidade: number };
  index: number;
  onDelete?: (index: number) => void;
  onUpdate?: (index: number, updatedPart: { codigo_peca: string; descricao: string; quantidade: number }) => void;
  company: string;
  readOnly?: boolean;
}> = ({ part, index, onDelete, onUpdate, company, readOnly }) => {
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState(part.codigo_peca);
  const [editDesc, setEditDesc] = useState(part.descricao);
  const [editQty, setEditQty] = useState<number | "">(part.quantidade);
  const [editQtyError, setEditQtyError] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditCode(part.codigo_peca);
      setEditDesc(part.descricao);
      setEditQty(part.quantidade);
      setEditQtyError(false);
    }
  }, [part, isEditing]);
  
  useEffect(() => {
    const fetchRelatedItems = async () => {
      const tableName = company === 'citrosuco' ? 'parts_citrosuco' : 'parts';
      try {
        const { data } = await supabase
          .from(tableName)
          .select('itens_relacionados')
          .eq('codigo', part.codigo_peca)
          .single();

        if (data?.itens_relacionados) {
          const rawItems = Array.isArray(data.itens_relacionados) 
            ? data.itens_relacionados 
            : [];
            
          const codes = rawItems.map((item: any) => 
            typeof item === 'string' ? item : (item.codigo || item.code)
          ).filter((c: any) => typeof c === 'string');

          if (codes.length > 0) {
            const { data: partsData } = await supabase
              .from(tableName)
              .select('codigo, descricao')
              .in('codigo', codes);
              
            if (partsData) {
               const partsMap = new Map(partsData.map(p => [p.codigo, p.descricao]));
               const formattedItems: RelatedItem[] = codes.map((code: string) => ({
                 code,
                 description: partsMap.get(code) || 'Descrição não encontrada'
               }));
               setRelatedItems(formattedItems);
            } else {
               setRelatedItems(codes.map((c: string) => ({ code: c, description: '' })));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching related items:", err);
      }
    };
    
    fetchRelatedItems();
  }, [part.codigo_peca, company]);

  const handleSaveEdit = () => {
    const qtyNum = editQty === "" ? 0 : Number(editQty);
    if (editQty === "" || isNaN(qtyNum) || qtyNum <= 0) {
      setEditQtyError(true);
      return;
    }

    if (onUpdate) {
      onUpdate(index, {
        codigo_peca: editCode,
        descricao: editDesc,
        quantidade: qtyNum
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditCode(part.codigo_peca);
    setEditDesc(part.descricao);
    setEditQty(part.quantidade);
    setEditQtyError(false);
    setIsEditing(false);
  };

  if (isEditing && !readOnly) {
    return (
      <div className="p-4 pl-8 md:pl-14 bg-blue-50/50 border-b border-blue-100 animate-in fade-in duration-200">
         <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-3 items-center">
           <div className="space-y-1">
             <span className="text-xs font-medium text-muted-foreground md:hidden">Código</span>
             <Input 
                value={editCode} 
                onChange={(e) => setEditCode(e.target.value)} 
                placeholder="Código" 
                className="h-9 text-sm font-mono"
                autoFocus
             />
           </div>
           <div className="space-y-1">
             <span className="text-xs font-medium text-muted-foreground md:hidden">Descrição</span>
             <Input 
                value={editDesc} 
                onChange={(e) => setEditDesc(e.target.value)} 
                placeholder="Descrição" 
                className="h-9 text-sm" 
             />
           </div>
           <div className="space-y-1">
             <span className="text-xs font-medium text-muted-foreground md:hidden">Qtd</span>
             <Input
                type="number"
                value={editQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setEditQty('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setEditQty(isNaN(parsed) ? '' : parsed);
                  }
                  setEditQtyError(false);
                }}
                className={cn("w-full md:w-20 h-9 text-sm text-center", editQtyError && "border-destructive focus-visible:ring-destructive")}
              />
              {editQtyError && (
                <p className="text-[10px] text-destructive mt-1">O valor tem que ser maior que "0"</p>
              )}
           </div>
           <div className="flex items-end justify-end gap-1 pt-1 md:pt-0">
              <Button size="sm" onClick={handleSaveEdit} className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
           </div>
         </div>
      </div>
    );
  }

  return (
    <div className="p-4 pl-8 md:pl-14 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center hover:bg-muted/20 transition-colors">
      <div className="space-y-1">
        <div className="font-semibold text-blue-600 hover:underline cursor-pointer text-sm">
          {part.codigo_peca}
        </div>
        <div className="text-sm text-foreground uppercase leading-tight">
          {part.descricao}
        </div>
        
        {relatedItems.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <div 
                className="flex items-center text-xs text-blue-500 font-medium cursor-pointer hover:text-blue-700 w-fit transition-colors mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                 <Tag className="h-3 w-3 mr-1" />
                 <span>{relatedItems.length} item(s) relacionado(s)</span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-[450px] p-4 bg-white shadow-lg border" align="start">
               <h4 className="font-bold text-sm mb-2 text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Itens Relacionados:
               </h4>
               <ul className="space-y-2 list-none pl-1">
                  {relatedItems.map((item, idx) => (
                     <li key={idx} className="text-xs text-muted-foreground leading-snug border-b last:border-0 pb-1 last:pb-0 border-dashed border-gray-200">
                        <span className="font-bold text-blue-600 mr-1">{item.code}</span>
                        <span className="text-gray-600">- {item.description}</span>
                     </li>
                  ))}
               </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex items-center justify-between md:contents">
         <span className="md:hidden text-sm font-medium text-muted-foreground">Qtd:</span>
         <div className="text-center w-16 font-medium text-sm">{part.quantidade}</div>
         
         {!readOnly && (
           <div className="flex items-center justify-end gap-1 w-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Excluir item</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente este item da lista.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete?.(index)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
         )}
      </div>
    </div>
  );
};

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({
  group,
  onEdit,
  onDelete,
  onSave,
  onAddPart,
  readOnly = false,
  additionalHeader,
  isSelected = false,
  onSelectChange
}) => {
  const { company } = useCompany();
  const { profile, user } = useSession();
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState<number | "">(1);
  const [quantityError, setQuantityError] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualCode, setManualCode] = useState('');

  const [frequentParts, setFrequentParts] = useState<Part[]>([]);
  const [favoriteParts, setFavoriteParts] = useState<Part[]>([]);

  // Load frequent parts for the user's profession
  useEffect(() => {
    const fetchFrequent = async () => {
      // Respect user preference. If disabled, do not show suggestions
      if (profile?.suggest_parts === false) {
        setFrequentParts([]);
        return;
      }

      if (profile?.profession_code && company) {
        try {
          const parts = await getFrequentPartsForProfession(profile.profession_code, company);
          setFrequentParts(parts);
        } catch (e) {
          console.error("Error loading frequent parts for ServiceOrderListDisplay:", e);
        }
      }
    };
    fetchFrequent();
  }, [profile?.profession_code, profile?.suggest_parts, company]);

  // Load favorite parts
  const fetchFavorites = async () => {
    try {
      const favs = await getFavoriteParts(user?.id, company);
      setFavoriteParts(favs);
    } catch (e) {
      console.error("Error loading favorite parts for ServiceOrderListDisplay:", e);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user?.id, company]);

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

  const displayedSearchResults = React.useMemo(() => {
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

  useEffect(() => {
    if (!searchQuery.trim() || selectedPart) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchParts(searchQuery, company);
        setSearchResults(results || []);
      } catch (error) {
        console.error("Error searching parts", error);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedPart, company]);

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery(part.descricao);
    setManualDescription(part.descricao);
    setManualCode(part.codigo);
    setSearchResults([]);
  };

  const handleAddPartConfirm = () => {
    if (!onSave) return;
    if (!manualDescription) return;

    const qtyNum = quantity === "" ? 0 : Number(quantity);
    if (quantity === "" || isNaN(qtyNum) || qtyNum <= 0) {
      setQuantityError(true);
      return;
    }

    const newPart = {
      codigo_peca: manualCode,
      descricao: manualDescription,
      quantidade: qtyNum
    };

    const updatedGroup = {
      ...group,
      parts: [...(group.parts || []), newPart]
    };

    onSave(updatedGroup);
    setIsAddingPart(false);
    setSelectedPart(null);
    setSearchQuery('');
    setManualDescription('');
    setManualCode('');
    setQuantity(1);
    setQuantityError(false);
  };

  const handleDeletePart = (index: number) => {
    if (!onSave) return;
    const updatedParts = [...(group.parts || [])];
    updatedParts.splice(index, 1);
    onSave({ ...group, parts: updatedParts });
  };

  const handleUpdatePart = (index: number, updatedPart: { codigo_peca: string; descricao: string; quantidade: number }) => {
    if (!onSave) return;
    const updatedParts = [...(group.parts || [])];
    updatedParts[index] = updatedPart;
    onSave({ ...group, parts: updatedParts });
  };

  const toggleAddPart = () => {
    if (onSave) {
      setIsAddingPart(!isAddingPart);
      if (!isAddingPart) {
        setSelectedPart(null);
        setSearchQuery('');
        setManualDescription('');
        setManualCode('');
        setQuantity(1);
        setQuantityError(false);
      }
    } else if (onAddPart) {
      onAddPart();
    }
  };

  const isPercurso = !!group.is_percurso;

  return (
    <div className={cn(
      "bg-card shadow-sm rounded-sm overflow-hidden overflow-visible border-l-4 transition-all",
      isPercurso
        ? "border-l-red-500 bg-red-50/[0.04] dark:bg-red-950/[0.04]"
        : "border-l-transparent"
    )}>
      <div className={cn("h-1 w-full", isPercurso ? "bg-red-500" : "bg-blue-600")}></div>
      
      {additionalHeader}
      
      <div className={cn("p-4 border-b", isPercurso ? "bg-red-50/30 border-red-100/30" : "bg-blue-50/30 border-blue-100/50")}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {!readOnly && (
              <div className="hidden md:flex pt-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            
            {onSelectChange && (
              <div className="pt-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelectChange(!!checked)}
                  aria-label={`Selecionar AF ${group.af}`}
                  className={cn(
                    "h-5 w-5 rounded cursor-pointer transition-colors",
                    isPercurso
                      ? "border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      : "border-blue-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  )}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className={cn("text-lg font-bold flex items-center gap-2", isPercurso ? "text-red-600" : "text-blue-600")}>
                  {isPercurso ? (
                    <>
                      {group.af ? `AF: ${group.af}` : 'Percurso sem AF'}
                      <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wide">
                        Percurso
                      </span>
                    </>
                  ) : (
                    <>
                      AF: {group.af}
                      {group.os && <span className="text-blue-600/80 text-base font-semibold">(OS: {group.os})</span>}
                    </>
                  )}
                </h3>
              </div>
              
              {(group.hora_inicio || group.hora_final) && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mr-2" />
                  <span>{group.hora_inicio || '--:--'} - {group.hora_final || '--:--'}</span>
                </div>
              )}
              
              <div className="text-foreground font-medium">
                {isPercurso ? (
                  <span className="text-red-600/80 font-semibold text-sm">Tempo de Deslocamento</span>
                ) : (
                  <>Serviço: {group.servico_executado || <span className="text-muted-foreground italic font-normal">Sem descrição</span>}</>
                )}
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 self-end md:self-start">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar OS</TooltipContent>
              </Tooltip>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Excluir OS</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente esta Ordem de Serviço e todos os seus itens.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      <div className="p-0">
        {group.parts && group.parts.length > 0 && (
          <div className="divide-y divide-border/40">
            {group.parts.map((part, index) => (
              <ServiceOrderPartRow 
                key={index}
                part={part}
                index={index}
                onDelete={handleDeletePart}
                onUpdate={handleUpdatePart}
                company={company}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="p-4 border-t border-border/40">
            {!isAddingPart ? (
              <div className="flex justify-center">
                <Button variant="outline" onClick={toggleAddPart} className="gap-2 text-foreground/80 hover:text-foreground">
                  <PlusCircle className="h-4 w-4" /> Adicionar Peça
                </Button>
              </div>
            ) : (
              <div className="bg-muted/30 p-4 rounded-md border animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                       <PlusCircle className="h-4 w-4" /> Nova Peça
                    </h4>
                    <Button variant="ghost" size="sm" onClick={toggleAddPart} className="h-6 w-6 p-0 rounded-full">
                       <X className="h-3 w-3" />
                    </Button>
                 </div>

                 <div className="grid gap-3 relative">
                    <div className="relative z-50">
                       <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input
                          placeholder="Buscar peça..."
                          value={searchQuery}
                          onChange={(e) => {
                             if (selectedPart) {
                                setSelectedPart(null);
                                setManualCode('');
                                setManualDescription(e.target.value);
                             }
                             setSearchQuery(e.target.value);
                          }}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => {
                             // Delay to allow item click
                             setTimeout(() => setIsSearchFocused(false), 150);
                          }}
                          className="pl-9"
                          autoFocus
                          autoComplete="off"
                       />
                       {isSearchFocused && !selectedPart && (searchQuery.length > 0 || frequentParts.length > 0 || favoriteParts.length > 0) && (
                          <div className="absolute z-[60] w-full mt-1 bg-popover rounded-md border shadow-2xl max-h-60 overflow-y-auto">
                             {displayedSearchResults.length > 0 ? (
                                displayedSearchResults.map((part, index) => {
                                   const isFrequent = frequentParts.some(fp => fp.codigo.toLowerCase() === part.codigo.toLowerCase());
                                   const isFav = favoriteParts.some(fp => fp.codigo.toLowerCase() === part.codigo.toLowerCase());

                                   const showFavoriteHeader = searchQuery.length === 0 && index === 0 && part.itemType === 'favorite';
                                   const showFrequentHeader = searchQuery.length === 0 &&
                                     (part.itemType === 'frequent' && (index === 0 || displayedSearchResults[index - 1].itemType === 'favorite'));

                                   return (
                                      <React.Fragment key={part.id || `disp-${index}`}>
                                         {showFavoriteHeader && (
                                            <div className="px-3 py-2 text-xs font-bold text-amber-600 bg-amber-500/5 border-b flex items-center gap-1.5 sticky top-0 z-10">
                                               <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> MEUS FAVORITOS
                                            </div>
                                         )}
                                         {showFrequentHeader && (
                                            <div className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-b flex items-center gap-1.5 sticky top-0 z-10">
                                               <span>⭐</span> SUGESTÕES PARA SUA PROFISSÃO
                                            </div>
                                         )}
                                         <div
                                            className="px-3 py-2 text-sm hover:bg-muted cursor-pointer border-b last:border-0 flex items-center justify-between group/item"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                               handleSelectPart(part);
                                               setIsSearchFocused(false);
                                            }}
                                         >
                                            <div className="flex flex-col flex-grow pr-4">
                                               <div className="flex items-center gap-2">
                                                  <div className="font-bold text-blue-600">{part.codigo}</div>
                                                  {isFrequent && (
                                                     <span className="text-blue-500 font-bold text-sm animate-pulse" title="Peça recomendada para sua profissão">
                                                        ★
                                                     </span>
                                                  )}
                                               </div>
                                               <div className="text-xs text-muted-foreground">{part.name || part.descricao}</div>
                                            </div>
                                            
                                            <button
                                               type="button"
                                               onMouseDown={(e) => e.preventDefault()}
                                               onClick={(e) => handleToggleFavorite(e, part)}
                                               className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                                               title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                            >
                                               <Star
                                                  className={cn(
                                                     "h-4 w-4 transition-all duration-200",
                                                     isFav ? "fill-amber-500 text-amber-500 scale-110" : "text-gray-300 dark:text-gray-600 hover:text-amber-400"
                                                  )}
                                               />
                                            </button>
                                         </div>
                                      </React.Fragment>
                                   );
                                })
                             ) : (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma peça encontrada.</div>
                             )}
                          </div>
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-3 relative z-40 items-start">
                       <Input
                          placeholder="Código"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          className="font-mono text-sm"
                       />
                       <Input
                          placeholder="Descrição"
                          value={manualDescription}
                          onChange={(e) => setManualDescription(e.target.value)}
                          className="text-sm"
                       />
                       <div className="flex flex-col gap-1 w-full md:w-20">
                         <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setQuantity('');
                              } else {
                                const parsed = parseInt(val, 10);
                                setQuantity(isNaN(parsed) ? '' : parsed);
                              }
                              setQuantityError(false);
                            }}
                            className={cn("w-full text-center", quantityError && "border-destructive focus-visible:ring-destructive")}
                         />
                         {quantityError && (
                           <p className="text-[10px] text-destructive text-center mt-1">O valor tem que ser maior que "0"</p>
                         )}
                       </div>
                       <Button onClick={handleAddPartConfirm} disabled={!manualDescription}>
                          <Check className="h-4 w-4 mr-2" /> Salvar
                       </Button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceOrderListDisplay;