"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceOrderData } from '@/types/supabase';
import { Clock, Pencil, Trash2, PlusCircle, Search, X, Check, GripVertical, Tag, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchParts, Part } from '@/services/partListService';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from '@/context/CompanyContext';

interface ServiceOrderListDisplayProps {
  group: ServiceOrderData;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (updatedOs: ServiceOrderData) => void;
  onAddPart?: () => void;
  readOnly?: boolean;
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
  const [editQty, setEditQty] = useState(part.quantidade);

  useEffect(() => {
    if (!isEditing) {
      setEditCode(part.codigo_peca);
      setEditDesc(part.descricao);
      setEditQty(part.quantidade);
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
    if (onUpdate) {
      onUpdate(index, {
        codigo_peca: editCode,
        descricao: editDesc,
        quantidade: editQty
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditCode(part.codigo_peca);
    setEditDesc(part.descricao);
    setEditQty(part.quantidade);
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
                onChange={(e) => setEditQty(parseInt(e.target.value) || 1)} 
                className="w-full md:w-20 h-9 text-sm text-center" 
                min={1} 
             />
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete?.(index)} 
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir item</TooltipContent>
              </Tooltip>
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
  readOnly = false 
}) => {
  const { company } = useCompany();
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [manualDescription, setManualDescription] = useState('');
  const [manualCode, setManualCode] = useState('');

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
      }
    } else if (onAddPart) {
      onAddPart();
    }
  };

  return (
    <div className="bg-card shadow-sm rounded-sm overflow-hidden overflow-visible">
      <div className="h-1 bg-blue-600 w-full"></div>
      
      <div className="p-4 bg-blue-50/30 border-b border-blue-100/50">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {!readOnly && (
              <div className="hidden md:flex pt-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onDelete} 
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir OS</TooltipContent>
              </Tooltip>
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
                          className="pl-9"
                          autoFocus
                       />
                       {searchQuery && !selectedPart && searchResults.length > 0 && (
                          <div className="absolute z-[60] w-full mt-1 bg-popover rounded-md border shadow-2xl max-h-60 overflow-y-auto">
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

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-3 relative z-40">
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
        )}
      </div>
    </div>
  );
};

export default ServiceOrderListDisplay;