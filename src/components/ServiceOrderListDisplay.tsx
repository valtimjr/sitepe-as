"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceOrderData } from '@/types/supabase';
import { Clock, Pencil, Trash2, PlusCircle, Search, X, Check, GripVertical, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchParts, Part } from '@/services/partListService';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ServiceOrderListDisplayProps {
  group: ServiceOrderData;
  onEdit: () => void;
  onDelete: () => void;
  onSave?: (updatedOs: ServiceOrderData) => void;
  onAddPart?: () => void; 
}

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ group, onEdit, onDelete, onSave, onAddPart }) => {
  // States for Inline Add Part
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!searchQuery.trim() || selectedPart) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchParts(searchQuery);
        setSearchResults(results || []);
      } catch (error) {
        console.error("Error searching parts", error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedPart]);

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery(part.descricao);
    setManualDescription(part.descricao);
    setManualCode(part.codigo);
    setSearchResults([]);
  };

  const handleAddPartConfirm = () => {
    if (!onSave) return;
    
    // Validate inputs
    if (!manualDescription) return;

    const newPart = {
      codigo_peca: manualCode,
      descricao: manualDescription,
      quantidade: quantity
    };

    const updatedGroup = {
      ...group,
      parts: [...(group.parts || []), newPart]
    };

    onSave(updatedGroup);
    
    // Reset form
    setIsAddingPart(false);
    setSelectedPart(null);
    setSearchQuery('');
    setManualDescription('');
    setManualCode('');
    setQuantity(1);
  };

  const handleDeletePart = (index: number) => {
    if (!onSave) return;
    
    const updatedParts = [...(group.parts || [])];
    updatedParts.splice(index, 1);
    
    const updatedGroup = {
      ...group,
      parts: updatedParts
    };
    
    onSave(updatedGroup);
  };

  const toggleAddPart = () => {
    if (onSave) {
      setIsAddingPart(!isAddingPart);
      if (!isAddingPart) {
        // Reset form when opening
        setSelectedPart(null);
        setSearchQuery('');
        setManualDescription('');
        setManualCode('');
        setQuantity(1);
      }
    } else if (onAddPart) {
      onAddPart();
    }
  };

  return (
    <div className="bg-card shadow-sm rounded-sm overflow-hidden">
      {/* Top Border */}
      <div className="h-1 bg-blue-600 w-full"></div>
      
      {/* Header Section */}
      <div className="p-4 bg-blue-50/30 border-b border-blue-100/50">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden md:flex pt-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-blue-600">
                  AF: {group.af} {group.os && <span className="text-blue-600/80 text-base font-semibold">(OS: {group.os})</span>}
                </h3>
              </div>
              
              {(group.hora_inicio || group.hora_final) && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mr-2" />
                  <span>{group.hora_inicio || '--:--'} - {group.hora_final || '--:--'}</span>
                </div>
              )}
              
              <div className="text-foreground font-medium">
                Serviço: {group.servico_executado || <span className="text-muted-foreground italic font-normal">Sem descrição</span>}
              </div>
            </div>
          </div>

          {/* Service Actions */}
          <div className="flex items-center gap-1 self-end md:self-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar OS</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir OS</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Parts List */}
      <div className="p-0">
        {group.parts && group.parts.length > 0 && (
          <div className="divide-y divide-border/40">
            {group.parts.map((part, index) => (
              <div key={index} className="p-4 pl-8 md:pl-14 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center hover:bg-muted/20 transition-colors">
                
                <div className="space-y-1">
                  <div className="font-semibold text-blue-600 hover:underline cursor-pointer text-sm">
                    {part.codigo_peca}
                  </div>
                  <div className="text-sm text-foreground uppercase leading-tight">
                    {part.descricao}
                  </div>
                  {/* Placeholder for related items if we had that data structure */}
                  <div className="flex items-center text-xs text-blue-500 font-medium">
                     <Tag className="h-3 w-3 mr-1" />
                     <span>Item relacionado</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:contents">
                   <span className="md:hidden text-sm font-medium text-muted-foreground">Qtd:</span>
                   <div className="text-center w-16 font-medium text-sm">{part.quantidade}</div>
                   
                   <div className="flex items-center justify-end gap-1 w-20">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePart(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                   </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Add Part Area */}
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

               <div className="grid gap-3">
                  <div className="relative">
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
                        className="pl-9"
                        autoFocus
                     />
                     {searchQuery && !selectedPart && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover rounded-md border shadow-md max-h-48 overflow-y-auto">
                           {searchResults.map((part) => (
                              <div
                                 key={part.id}
                                 className="px-3 py-2 text-sm hover:bg-muted cursor-pointer border-b last:border-0"
                                 onClick={() => handleSelectPart(part)}
                              >
                                 <div className="font-bold text-blue-600">{part.codigo}</div>
                                 <div className="text-xs text-muted-foreground">{part.descricao}</div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-3">
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
                     <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-20 text-center"
                     />
                     <Button onClick={handleAddPartConfirm} disabled={!manualDescription}>
                        <Check className="h-4 w-4 mr-2" /> Salvar
                     </Button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderListDisplay;