"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceOrderData } from '@/types/supabase';
import { Clock, Pencil, Trash2, Tag, ChevronDown, ChevronUp, PlusCircle, Search, X, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { searchParts, Part } from '@/services/partListService';
import { cn } from '@/lib/utils';

interface ServiceOrderListDisplayProps {
  group: ServiceOrderData;
  onEdit: () => void;
  onDelete: () => void;
  onSave?: (updatedOs: ServiceOrderData) => void;
  onAddPart?: () => void; // Mantendo para compatibilidade, mas o comportamento será inline se onSave existir
}

const ServiceOrderListDisplay: React.FC<ServiceOrderListDisplayProps> = ({ group, onEdit, onDelete, onSave, onAddPart }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
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
    if (!searchQuery.trim()) {
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
  }, [searchQuery]);

  const handleSelectPart = (part: Part) => {
    setSelectedPart(part);
    setSearchQuery('');
    setSearchResults([]);
    setManualDescription(part.descricao);
    setManualCode(part.codigo);
  };

  const handleAddPartConfirm = () => {
    if (!onSave) return;
    
    // Validate inputs
    if (!selectedPart && !manualDescription) return;

    const newPart = {
      codigo_peca: selectedPart ? selectedPart.codigo : manualCode,
      descricao: selectedPart ? selectedPart.descricao : manualDescription,
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
    setIsExpanded(true); // Ensure list is expanded to show new part
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
    <Card className="border-l-4 border-l-primary overflow-visible transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-primary">AF: {group.af}</h3>
              {group.os && (
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                  OS: {group.os}
                </span>
              )}
            </div>
            
            {(group.hora_inicio || group.hora_final) && (
              <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{group.hora_inicio || '??:??'} - {group.hora_final || '??:??'}</span>
              </div>
            )}

            {group.servico_executado && (
              <p className="text-sm text-foreground/80 leading-relaxed pt-1">
                {group.servico_executado}
              </p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={isAddingPart ? "default" : "outline"}
                  size="icon" 
                  onClick={toggleAddPart} 
                  className={cn(
                    "h-9 w-9", 
                    isAddingPart 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "text-primary border-primary/50 hover:bg-primary/10"
                  )}
                >
                  {isAddingPart ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isAddingPart ? "Cancelar" : "Adicionar Peça"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-9 w-9">
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-9 w-9">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Inline Add Part Form */}
        {isAddingPart && (
          <div className="border-t bg-muted/40 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <PlusCircle className="h-3 w-3" /> Adicionar Peça
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-start">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={selectedPart ? "Peça selecionada" : "Buscar peça (código, nome, tag)..."}
                    value={selectedPart ? selectedPart.descricao : searchQuery}
                    onChange={(e) => {
                      if (selectedPart) {
                         // If editing the selected part text, switch to manual mode
                         setSelectedPart(null);
                         setManualDescription(e.target.value);
                      } else {
                        setSearchQuery(e.target.value);
                        setManualDescription(e.target.value);
                      }
                    }}
                    className={cn("pl-9", selectedPart && "font-medium bg-primary/5 border-primary/30 text-primary")}
                    autoFocus
                  />
                  {selectedPart && (
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                       onClick={() => {
                         setSelectedPart(null);
                         setSearchQuery('');
                         setManualDescription('');
                         setManualCode('');
                       }}
                     >
                       <X className="h-3 w-3" />
                     </Button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchQuery && !selectedPart && (
                  <div className="absolute z-10 w-full mt-1 bg-popover rounded-md border shadow-md max-h-48 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-xs text-center text-muted-foreground">Buscando...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((part) => (
                        <div
                          key={part.id}
                          className="px-3 py-2 text-sm hover:bg-muted cursor-pointer transition-colors border-b last:border-0"
                          onClick={() => handleSelectPart(part)}
                        >
                          <div className="font-medium text-foreground">{part.codigo}</div>
                          <div className="text-xs text-muted-foreground truncate">{part.descricao}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-center text-muted-foreground">
                        Nenhuma peça encontrada. <br/>
                        <span className="opacity-70">Use o texto digitado como descrição manual.</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Manual Fields if needed */}
                {!selectedPart && searchQuery.length > 0 && searchResults.length === 0 && (
                   <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input 
                        placeholder="Código (Opcional)" 
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="text-xs h-8"
                      />
                   </div>
                )}
              </div>

              <div className="w-24">
                 <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="text-center"
                    placeholder="Qtd"
                 />
              </div>

              <Button onClick={handleAddPartConfirm} disabled={(!selectedPart && !manualDescription) || quantity < 1}>
                <Check className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        )}

        {isExpanded && group.parts && group.parts.length > 0 && (
          <div className="border-t bg-muted/20">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="h-10 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold py-0">Peça</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold py-0">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.parts.map((part, i) => (
                  <TableRow key={i} className="hover:bg-muted/40">
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{part.codigo_peca}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">
                            {part.descricao}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium">{part.quantidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceOrderListDisplay;